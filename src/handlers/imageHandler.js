/**
 * Image Generator Handler
 * Uses Google Gemini / Imagen API through @google/genai.
 */

const { GoogleGenAI } = require('@google/genai');
const { logger } = require('../utils/helpers');

const waitingForImagePrompt = new Set();

class ImageHandler {
  constructor() {
    this.isInitialized = true;
    this.client = null;
    this.clientKey = '';

    this.model = String(process.env.GEMINI_IMAGE_MODEL || 'imagen-4.0-generate-001').trim();
    this.timeoutMs = this.toInt(process.env.GEMINI_IMAGE_TIMEOUT_MS, 30000, 5000, 120000);

    if (!this.getGeminiKey()) {
      logger.warn('⚠️ GEMINI_API_KEY not found in environment variables (image generation disabled).');
    } else {
      logger.info(`✅ Image Generator initialized with Gemini model: ${this.model}`);
    }
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
    return this.isInitialized && !!this.getClient();
  }

  checkInappropriateContent(prompt) {
    const patterns = [
      /عاري/i, /جنس/i, /إباح/i, /porn/i, /nude/i, /sex/i,
      /عنف/i, /دموي/i, /violent/i, /gore/i, /kill/i,
      /كراهية/i, /hate/i, /racist/i
    ];
    return patterns.some((pattern) => pattern.test(prompt));
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

  async generateImageBuffer(prompt) {
    try {
      const client = this.getClient();
      if (!client) {
        return { success: false, error: 'خدمة توليد الصور غير متاحة. أضف GEMINI_API_KEY في الإعدادات.' };
      }

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
      logger.info(`🎨 Generating image (Gemini) for: ${cleanPrompt.substring(0, 40)}...`);

      const response = await Promise.race([
        client.models.generateImages({
          model: this.model,
          prompt: cleanPrompt,
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

      logger.info('✅ Gemini image generated successfully');
      return { success: true, buffer };
    } catch (error) {
      const message = String(error?.message || error);
      logger.error('❌ Image generation error:', message);

      if (message.includes('GEMINI_IMAGE_TIMEOUT')) {
        return { success: false, error: 'تأخر توليد الصورة. حاول بوصف أقصر أو أعد المحاولة.' };
      }
      if (message.includes('401') || message.includes('403') || /api key|unauth|permission/i.test(message)) {
        return { success: false, error: 'مفتاح GEMINI_API_KEY غير صالح أو بدون صلاحية.' };
      }
      if (message.includes('429') || /quota|rate/i.test(message)) {
        return { success: false, error: 'تم تجاوز حد الطلبات أو الحصة. حاول لاحقا.' };
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
        await ctx.reply('❌ خدمة توليد الصور غير متاحة. أضف GEMINI_API_KEY في إعدادات البوت.');
        return;
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
      if (!this.isAvailable()) {
        await ctx.reply('❌ خدمة توليد الصور غير متاحة. أضف GEMINI_API_KEY في إعدادات البوت.');
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
