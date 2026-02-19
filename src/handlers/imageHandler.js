/**
 * Image Generator Handler
 * Handles image generation using Google Gemini API (Imagen)
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { logger } = require('../utils/helpers');

class ImageHandler {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.isInitialized = false;

    // Safety settings to prevent inappropriate content
    this.safetySettings = [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ];

    // Initialize if API key is available
    this.initialize();
  }

  /**
   * Initialize the Gemini API client
   */
  initialize() {
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        logger.warn('⚠️ GEMINI_API_KEY not found in environment variables');
        return;
      }

      this.genAI = new GoogleGenerativeAI(apiKey);

      // Use Gemini 2.0 Flash for image generation (supports image output)
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp'
      });

      this.isInitialized = true;
      logger.info('✅ Image Generator initialized successfully with Gemini Imagen');
    } catch (error) {
      logger.error('❌ Failed to initialize Image Generator:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Check if the service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.isInitialized && this.model !== null;
  }

  /**
   * Generate an image from text prompt
   * @param {string} prompt - Text description for image generation
   * @returns {Promise<{success: boolean, data?: Buffer, error?: string}>}
   */
  async generateImage(prompt) {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'خدمة توليد الصور غير متاحة حالياً. يرجى التحقق من إعدادات API.'
        };
      }

      // Validate prompt
      if (!prompt || prompt.trim().length === 0) {
        return {
          success: false,
          error: 'يرجى إدخال وصف للصورة التي تريد توليدها.'
        };
      }

      // Limit prompt length
      if (prompt.length > 500) {
        return {
          success: false,
          error: 'الوصف طويل جداً. يرجى اختصاره إلى أقل من 500 حرف.'
        };
      }

      // Check for inappropriate content in prompt
      const inappropriateWords = this.checkInappropriateContent(prompt);
      if (inappropriateWords) {
        return {
          success: false,
          error: 'عذراً، لا يمكن توليد صور تحتوي على محتوى غير لائق.'
        };
      }

      logger.info(`🎨 Generating image for prompt: ${prompt.substring(0, 50)}...`);

      // Generate image using Imagen
      const result = await this.model.generateContent({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          responseModalities: ['IMAGE']
        },
        safetySettings: this.safetySettings
      });

      // Extract image data from response
      const response = result.response;

      if (!response || !response.candidates || response.candidates.length === 0) {
        return {
          success: false,
          error: 'لم يتمكن النظام من توليد الصورة. جرب وصفاً مختلفاً.'
        };
      }

      const candidate = response.candidates[0];

      // Check if blocked by safety
      if (candidate.finishReason === 'SAFETY') {
        return {
          success: false,
          error: 'تم حظر توليد الصورة بسبب محتوى غير آمن. جرب وصفاً مختلفاً.'
        };
      }

      // Get image data
      const parts = candidate.content?.parts || [];
      let imageData = null;

      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          imageData = Buffer.from(part.inlineData.data, 'base64');
          break;
        }
      }

      if (!imageData) {
        return {
          success: false,
          error: 'لم يتم استلام بيانات الصورة من الخادم.'
        };
      }

      logger.info('✅ Image generated successfully');

      return {
        success: true,
        data: imageData,
        mimeType: 'image/png'
      };

    } catch (error) {
      logger.error('❌ Image generation error:', error.message);

      // Handle specific errors
      if (error.message?.includes('quota')) {
        return {
          success: false,
          error: 'تم تجاوز حد الاستخدام اليومي. يرجى المحاولة لاحقاً.'
        };
      }

      if (error.message?.includes('invalid') || error.message?.includes('key')) {
        return {
          success: false,
          error: 'خطأ في إعدادات API. يرجى التواصل مع المطور.'
        };
      }

      return {
        success: false,
        error: 'حدث خطأ أثناء توليد الصورة. يرجى المحاولة مرة أخرى.'
      };
    }
  }

  /**
   * Check for inappropriate content in prompt
   * @param {string} prompt
   * @returns {boolean}
   */
  checkInappropriateContent(prompt) {
    const inappropriatePatterns = [
      // Add patterns to filter inappropriate content
      /عاري/i, /جنس/i, /إباحي/i, /porn/i, /nude/i, /sex/i,
      /عنف/i, /دموي/i, /violent/i, /gore/i, /kill/i,
      /كراهية/i, /hate/i, /racist/i
    ];

    return inappropriatePatterns.some(pattern => pattern.test(prompt));
  }

  /**
   * Handle /image command
   * @param {TelegrafContext} ctx
   */
  async handleImageCommand(ctx) {
    try {
      const messageText = ctx.message?.text || '';
      const args = messageText.split(' ').slice(1).join(' ');

      if (!args) {
        await ctx.reply(
          '🎨 <b>مولد الصور بالذكاء الاصطناعي</b>\n\n' +
          'استخدم الأمر كالتالي:\n' +
          '<code>/image وصف الصورة</code>\n\n' +
          '📝 <b>أمثلة:</b>\n' +
          '• /image غروب الشمس على شاطئ استوائي\n' +
          '• /image قطة لطيفة ترتدي نظارة شمسية\n' +
          '• /image مسجد جميل في الليل\n\n' +
          '⚠️ <i>ملاحظة: لا يمكن توليد صور ذات محتوى غير لائق</i>',
          { parse_mode: 'HTML' }
        );
        return;
      }

      // Show typing indicator
      await ctx.reply('⏳ جاري توليد الصورة...');

      // Generate image
      const result = await this.generateImage(args);

      if (result.success) {
        // Send the generated image
        await ctx.replyWithPhoto(
          { source: result.data },
          {
            caption: `🎨 <b>صورتك المولدة</b>\n\n📝 الوصف: ${args}\n\n✨ تم توليدها بواسطة Google Imagen`,
            parse_mode: 'HTML'
          }
        );
      } else {
        await ctx.reply(`❌ ${result.error}`);
      }

    } catch (error) {
      logger.error('Image command error:', error);
      await ctx.reply('❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * Handle image generation from callback query
   * @param {TelegrafContext} ctx
   */
  async handleImageCallback(ctx) {
    try {
      await ctx.answerCbQuery();

      const { Markup } = require('telegraf');

      await ctx.editMessageText(
        '🎨 <b>مولد الصور بالذكاء الاصطناعي</b>\n\n' +
        'أرسل وصفاً للصورة التي تريد توليدها:\n\n' +
        '📝 <b>أمثلة:</b>\n' +
        '• غروب الشمس على شاطئ استوائي\n' +
        '• قطة لطيفة ترتدي نظارة شمسية\n' +
        '• مسجد جميل في الليل\n\n' +
        '⚠️ <i>ملاحظة: لا يمكن توليد صور ذات محتوى غير لائق</i>',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.forceReply().reply_markup
        }
      );

      // Set session to await image prompt
      ctx.session = ctx.session || {};
      ctx.session.awaitingImagePrompt = true;

    } catch (error) {
      logger.error('Image callback error:', error);
      await ctx.answerCbQuery('❌ حدث خطأ');
    }
  }

  /**
   * Handle text message for image prompt (when awaiting)
   * @param {TelegrafContext} ctx
   * @param {string} prompt
   * @returns {Promise<boolean>} - Whether the message was handled
   */
  async handleImagePrompt(ctx, prompt) {
    try {
      if (!ctx.session?.awaitingImagePrompt) {
        return false;
      }

      // Clear the awaiting state
      ctx.session.awaitingImagePrompt = false;

      // Show typing indicator
      await ctx.reply('⏳ جاري توليد الصورة...');

      // Generate image
      const result = await this.generateImage(prompt);

      if (result.success) {
        // Send the generated image
        await ctx.replyWithPhoto(
          { source: result.data },
          {
            caption: `🎨 <b>صورتك المولدة</b>\n\n📝 الوصف: ${prompt}\n\n✨ تم توليدها بواسطة Google Imagen`,
            parse_mode: 'HTML'
          }
        );
      } else {
        await ctx.reply(`❌ ${result.error}`);
      }

      return true;

    } catch (error) {
      logger.error('Image prompt handling error:', error);
      ctx.session.awaitingImagePrompt = false;
      await ctx.reply('❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      return true;
    }
  }

  /**
   * Get image generator menu keyboard
   * @returns {Object}
   */
  static getImageMenuKeyboard() {
    const { Markup } = require('telegraf');

    return Markup.inlineKeyboard([
      [{ text: '🎨 توليد صورة جديدة', callback_data: 'image:generate' }],
      [{ text: '⬅️ رجوع', callback_data: 'menu:main' }]
    ]);
  }
}

// Export singleton instance
const imageHandler = new ImageHandler();

module.exports = imageHandler;
