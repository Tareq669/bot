/**
 * Image Generator Handler
 * Uses Google Gemini / Imagen API through @google/genai.
 */

const { GoogleGenAI } = require('@google/genai');
const fetch = require('node-fetch');
const { logger } = require('../utils/helpers');

const waitingForImagePrompt = new Set();

class ImageHandler {
  constructor() {
    this.isInitialized = true;
    this.client = null;
    this.clientKey = '';

    this.model = String(process.env.GEMINI_IMAGE_MODEL || 'imagen-4.0-generate-001').trim();
    this.timeoutMs = this.toInt(process.env.GEMINI_IMAGE_TIMEOUT_MS, 30000, 5000, 120000);
    this.hfModel = String(process.env.HF_IMAGE_MODEL || 'stabilityai/stable-diffusion-xl-base-1.0').trim();
    this.hfTranslationModel = String(process.env.HF_TRANSLATION_MODEL || 'Helsinki-NLP/opus-mt-ar-en').trim();
    this.translateArabicPrompts = String(process.env.HF_TRANSLATE_ARABIC_PROMPTS || 'true').trim().toLowerCase() !== 'false';
    this.hfTimeoutMs = this.toInt(process.env.HF_IMAGE_TIMEOUT_MS, this.timeoutMs, 5000, 120000);
    this.fallbackEnabled = String(process.env.FREE_IMAGE_FALLBACK || 'true').trim().toLowerCase() !== 'false';
    this.fallbackEndpoints = this.parseFallbackEndpoints();
    this.geminiBillingLocked = false;

    if (!this.getGeminiKey()) {
      logger.warn('⚠️ GEMINI_API_KEY not found in environment variables (image generation disabled).');
    } else {
      logger.info(`✅ Image Generator initialized with Gemini model: ${this.model}`);
    }

    if (this.getHfToken()) {
      logger.info(`✅ HF image fallback enabled with model: ${this.hfModel}`);
    }
  }

  parseFallbackEndpoints() {
    const configured = String(
      process.env.FREE_IMAGE_ENDPOINTS ||
      process.env.FREE_IMAGE_ENDPOINT ||
      'https://pollinations.ai/p,https://image.pollinations.ai/prompt'
    ).trim();

    return configured
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  toInt(value, fallback, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    if (num < min || num > max) return fallback;
    return Math.floor(num);
  }

  getGeminiKey() {
    const rawKey = process.env.GEMINI_API_KEY;
    if (typeof rawKey !== 'string') return '';
    return rawKey.trim().replace(/^["']|["']$/g, '');
  }

  getHfToken() {
    const rawToken = process.env.HF_TOKEN;
    if (typeof rawToken !== 'string') return '';
    return rawToken.trim().replace(/^["']|["']$/g, '');
  }

  getClient() {
    const key = this.getGeminiKey();
    if (!key) return null;

    if (!this.client || this.clientKey !== key) {
      this.client = new GoogleGenAI({ apiKey: key });
      this.clientKey = key;
    }

    return this.client;
  }

  isAvailable() {
    return this.isInitialized && (Boolean(this.getClient()) || Boolean(this.getHfToken()) || this.fallbackEnabled);
  }

  checkInappropriateContent(prompt) {
    const patterns = [
      /عاري/i, /جنس/i, /إباح/i, /porn/i, /nude/i, /sex/i,
      /عنف/i, /دموي/i, /violent/i, /gore/i, /kill/i,
      /كراهية/i, /hate/i, /racist/i
    ];
    return patterns.some((pattern) => pattern.test(prompt));
  }

  hasArabicText(text) {
    return /[\u0600-\u06FF]/.test(String(text || ''));
  }

  extractTranslatedText(payload) {
    if (Array.isArray(payload) && payload.length > 0) {
      const first = payload[0];
      if (typeof first === 'string') return first;
      if (first && typeof first === 'object') {
        if (typeof first.translation_text === 'string') return first.translation_text;
        if (typeof first.generated_text === 'string') return first.generated_text;
      }
    }
    if (payload && typeof payload === 'object') {
      if (typeof payload.translation_text === 'string') return payload.translation_text;
      if (typeof payload.generated_text === 'string') return payload.generated_text;
    }
    return '';
  }

  async translatePromptIfNeeded(prompt) {
    const input = String(prompt || '').trim();
    if (!input || !this.translateArabicPrompts || !this.hasArabicText(input)) {
      return input;
    }

    const token = this.getHfToken();
    if (!token) {
      return input;
    }

    try {
      const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(this.hfTranslationModel)}`;
      const response = await fetch(url, {
        method: 'POST',
        timeout: this.hfTimeoutMs,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: input,
          options: { wait_for_model: true }
        })
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        logger.warn(`Arabic translation failed (${response.status}): ${body}`);
        return input;
      }

      const payload = await response.json();
      const translated = this.extractTranslatedText(payload).trim();
      if (!translated) return input;
      logger.info(`Arabic prompt translated: ${translated.substring(0, 100)}`);
      return translated;
    } catch (error) {
      logger.warn(`Arabic translation error: ${String(error?.message || error)}`);
      return input;
    }
  }

  extractImageBytes(response) {
    const maybeBytes = response?.generatedImages?.[0]?.image?.imageBytes;
    if (!maybeBytes) return null;

    if (Buffer.isBuffer(maybeBytes)) {
      return maybeBytes;
    }

    if (typeof maybeBytes === 'string') {
      try {
        return Buffer.from(maybeBytes, 'base64');
      } catch {
        return null;
      }
    }

    if (maybeBytes instanceof Uint8Array) {
      return Buffer.from(maybeBytes);
    }

    return null;
  }

  async generateWithGemini(prompt) {
    const client = this.getClient();
    if (!client) {
      throw new Error('GEMINI_KEY_MISSING');
    }

    const response = await Promise.race([
      client.models.generateImages({
        model: this.model,
        prompt,
        config: {
          numberOfImages: 1
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('GEMINI_IMAGE_TIMEOUT')), this.timeoutMs))
    ]);

    const buffer = this.extractImageBytes(response);
    if (!buffer || buffer.length === 0) {
      throw new Error('EMPTY_GEMINI_IMAGE');
    }
    return buffer;
  }

  async generateWithFreeFallback(prompt) {
    let lastError = null;

    for (const endpoint of this.fallbackEndpoints) {
      const base = endpoint.replace(/\/+$/, '');
      const url = `${base}/${encodeURIComponent(prompt)}?nologo=true&private=true&safe=true`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          timeout: this.timeoutMs,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)'
          }
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`FREE_IMAGE_HTTP_${response.status}: ${body}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (!buffer || buffer.length < 32) {
          throw new Error('EMPTY_FREE_IMAGE');
        }

        logger.info(`✅ Free fallback image generated from: ${base}`);
        return buffer;
      } catch (error) {
        const message = String(error?.message || error);
        logger.warn(`Free fallback endpoint failed (${base}): ${message}`);
        lastError = error;
      }
    }

    throw lastError || new Error('FREE_IMAGE_ALL_ENDPOINTS_FAILED');
  }

  async generateWithHuggingFace(prompt) {
    const token = this.getHfToken();
    if (!token) {
      throw new Error('HF_TOKEN_MISSING');
    }

    const url = `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(this.hfModel)}`;
    const response = await fetch(url, {
      method: 'POST',
      timeout: this.hfTimeoutMs,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        options: {
          wait_for_model: true
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(`HF_IMAGE_HTTP_${response.status}: ${errorBody}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (!buffer || buffer.length < 32) {
      throw new Error('EMPTY_HF_IMAGE');
    }
    return buffer;
  }

  async generateImageBuffer(prompt) {
    try {
      if (!prompt || !String(prompt).trim()) {
        return { success: false, error: 'يرجى إدخال وصف للصورة.' };
      }

      if (prompt.length > 500) {
        return { success: false, error: 'الوصف طويل جدا.' };
      }

      if (this.checkInappropriateContent(prompt)) {
        return { success: false, error: 'عذرا، لا يمكن توليد هذا المحتوى.' };
      }

      const cleanPrompt = String(prompt).trim();
      const promptForGeneration = await this.translatePromptIfNeeded(cleanPrompt);
      logger.info(`🎨 Generating image for: ${promptForGeneration.substring(0, 40)}...`);

      if (!this.geminiBillingLocked) {
        try {
          const geminiBuffer = await this.generateWithGemini(promptForGeneration);
          logger.info('✅ Gemini image generated successfully');
          return { success: true, buffer: geminiBuffer };
        } catch (geminiError) {
          const geminiMsg = String(geminiError?.message || geminiError);
          const isBillingLocked = /billed users|only accessible to billed users|billing/i.test(geminiMsg);
          const canFallback = this.fallbackEnabled;

          logger.warn(`Gemini image failed: ${geminiMsg}`);

          if (isBillingLocked) {
            this.geminiBillingLocked = true;
            logger.warn('⚠️ Gemini image temporarily disabled due to billing requirement; using fallbacks.');
          }

          // Step 2 fallback: Hugging Face (if token exists)
          if (this.getHfToken()) {
            try {
              const hfBuffer = await this.generateWithHuggingFace(promptForGeneration);
              logger.info('✅ HF fallback image generated successfully');
              return { success: true, buffer: hfBuffer };
            } catch (hfError) {
              const hfMsg = String(hfError?.message || hfError);
              logger.warn(`HF fallback image failed: ${hfMsg}`);
            }
          }

          // Step 3 fallback: free endpoints
          if (canFallback) {
            try {
              const fallbackBuffer = await this.generateWithFreeFallback(promptForGeneration);
              return { success: true, buffer: fallbackBuffer };
            } catch (fallbackError) {
              const fallbackMsg = String(fallbackError?.message || fallbackError);
              logger.error(`❌ Free fallback image failed: ${fallbackMsg}`);
              throw new Error(`${geminiMsg} | fallback: ${fallbackMsg}`);
            }
          }

          if (isBillingLocked) {
            return {
              success: false,
              error: 'توليد الصور عبر Gemini يحتاج Billing مفعل. فعّل Billing أو فعّل fallback المجاني.'
            };
          }

          throw geminiError;
        }
      }

      // Gemini is disabled due billing in this runtime, go directly to fallbacks
      if (this.getHfToken()) {
        try {
          const hfBuffer = await this.generateWithHuggingFace(promptForGeneration);
          logger.info('✅ HF fallback image generated successfully');
          return { success: true, buffer: hfBuffer };
        } catch (hfError) {
          const hfMsg = String(hfError?.message || hfError);
          logger.warn(`HF fallback image failed: ${hfMsg}`);
        }
      }

      if (this.fallbackEnabled) {
        try {
          const fallbackBuffer = await this.generateWithFreeFallback(promptForGeneration);
          return { success: true, buffer: fallbackBuffer };
        } catch (fallbackError) {
          const fallbackMsg = String(fallbackError?.message || fallbackError);
          logger.error(`❌ Free fallback image failed: ${fallbackMsg}`);
          throw new Error(`FALLBACK_FAILED: ${fallbackMsg}`);
        }
      }

      return { success: false, error: 'لا يوجد مزود صور متاح حاليا.' };
    } catch (error) {
      const message = String(error?.message || error);
      logger.error('❌ Image generation error:', message);

      if (message.includes('GEMINI_IMAGE_TIMEOUT')) {
        return { success: false, error: 'تأخر توليد الصورة. حاول بوصف أقصر أو أعد المحاولة.' };
      }
      if (message.includes('401') || message.includes('403') || /api key|unauth|permission/i.test(message)) {
        return { success: false, error: 'مفتاح GEMINI_API_KEY غير صالح أو بدون صلاحية.' };
      }
      if (message.includes('HF_IMAGE_HTTP_401') || message.includes('HF_IMAGE_HTTP_403')) {
        return { success: false, error: 'HF_TOKEN غير صالح أو بدون صلاحيات inference.' };
      }
      if (message.includes('429') || /quota|rate/i.test(message)) {
        return { success: false, error: 'تم تجاوز حد الطلبات أو الحصة. حاول لاحقا.' };
      }
      if (/billed users|billing/i.test(message)) {
        return { success: false, error: 'خدمة Imagen تتطلب Billing. فعّل Billing أو استخدم fallback المجاني.' };
      }
      if (message.includes('400') || /INVALID_ARGUMENT|safety/i.test(message)) {
        return { success: false, error: 'الوصف غير مقبول لهذا النموذج. جرّب صياغة مختلفة.' };
      }

      return { success: false, error: 'حدث خطأ في توليد الصورة. حاول مرة أخرى.' };
    }
  }

  async handleImageButton(ctx) {
    try {
      if (!this.isAvailable()) {
        if (!this.fallbackEnabled) {
          await ctx.reply('❌ خدمة توليد الصور غير متاحة. أضف GEMINI_API_KEY أو فعّل fallback المجاني.');
          return;
        }
        logger.warn('⚠️ GEMINI_API_KEY missing, relying on free image fallback.');
      }

      const userId = ctx.from.id;
      waitingForImagePrompt.add(userId);

      await ctx.reply(
        '🎨 اكتب وصف الصورة التي تريد توليدها\n\nمثال: فارس عربي على حصان أبيض عند الغروب'
      );

      logger.info(`User ${userId} is now waiting for image prompt`);
    } catch (error) {
      logger.error('Image button error:', error);
      await ctx.reply('❌ حدث خطأ. يرجى المحاولة مرة أخرى.');
    }
  }

  async handleImageCallback(ctx) {
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery();
      }
      await this.handleImageButton(ctx);
    } catch (error) {
      logger.error('Image callback error:', error);
      await ctx.reply('❌ حدث خطأ. يرجى المحاولة مرة أخرى.');
    }
  }

  async handleTextMessage(ctx) {
    try {
      const userId = ctx.from.id;
      if (!waitingForImagePrompt.has(userId)) return false;

      waitingForImagePrompt.delete(userId);
      const prompt = String(ctx.message?.text || '');

      await ctx.sendChatAction('upload_photo');
      await ctx.reply('⏳ جاري توليد الصورة...');

      const result = await this.generateImageBuffer(prompt);
      if (result.success) {
        await ctx.replyWithPhoto(
          { source: result.buffer, filename: 'image.png' },
          { caption: `🎨 تم توليد الصورة بنجاح!\n\n📝 الوصف: ${prompt}` }
        );
      } else {
        await ctx.reply(`❌ ${result.error}`);
      }

      return true;
    } catch (error) {
      logger.error('Image text handling error:', error);
      if (ctx.from?.id) waitingForImagePrompt.delete(ctx.from.id);
      await ctx.reply('❌ حدث خطأ. يرجى المحاولة مرة أخرى.');
      return true;
    }
  }

  async handleImageCommand(ctx) {
    try {
      if (!this.isAvailable() && !this.fallbackEnabled) {
        await ctx.reply('❌ خدمة توليد الصور غير متاحة. أضف GEMINI_API_KEY أو فعّل fallback المجاني.');
        return;
      }

      const messageText = String(ctx.message?.text || '');
      const args = messageText.split(' ').slice(1).join(' ');

      if (!args) {
        await ctx.reply(
          '🎨 <b>مولد الصور بالذكاء الاصطناعي (Gemini)</b>\n\n' +
          'استخدم الأمر كالتالي:\n' +
          '<code>/image وصف الصورة</code>\n\n' +
          '📝 <b>أمثلة:</b>\n' +
          '• /image مدينة عربية مستقبلية ليلا\n' +
          '• /image قطة كرتونية لطيفة بنظارات\n\n' +
          '⚠️ <i>المحتوى غير اللائق مرفوض تلقائيا</i>',
          { parse_mode: 'HTML' }
        );
        return;
      }

      await ctx.sendChatAction('upload_photo');
      await ctx.reply('⏳ جاري توليد الصورة...');

      const result = await this.generateImageBuffer(args);
      if (result.success) {
        await ctx.replyWithPhoto(
          { source: result.buffer, filename: 'image.png' },
          { caption: `🎨 تم توليد الصورة بنجاح!\n\n📝 الوصف: ${args}` }
        );
      } else {
        await ctx.reply(`❌ ${result.error}`);
      }
    } catch (error) {
      logger.error('Image command error:', error);
      await ctx.reply('❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    }
  }

  isWaitingForImagePrompt(userId) {
    return waitingForImagePrompt.has(userId);
  }

  clearWaitingState(userId) {
    waitingForImagePrompt.delete(userId);
  }
}

const imageHandler = new ImageHandler();
module.exports = imageHandler;
