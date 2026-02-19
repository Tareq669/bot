/**
 * Image Generator Handler
 * Handles image generation using Google Gemini API
 */

const { GoogleGenAI } = require('@google/genai');
const { logger } = require('../utils/helpers');

class ImageHandler {
  constructor() {
    this.ai = null;
    this.isInitialized = false;

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

      this.ai = new GoogleGenAI({ apiKey });

      this.isInitialized = true;
      logger.info('✅ Image Generator initialized successfully with Gemini');
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
    return this.isInitialized && this.ai !== null;
  }

  /**
   * Generate an image description using Gemini
   * @param {string} prompt - Text description for image generation
   * @returns {Promise<{success: boolean, description?: string, error?: string}>}
   */
  async generateImageDescription(prompt) {
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

      logger.info('🎨 Generating image description for: ' + prompt.substring(0, 50) + '...');

      // Generate detailed image description using Gemini
      const response = await this.ai.models.generateContent({
        model: 'gemini-pro',
        contents: 'You are an AI image description generator. Create a detailed, vivid description for an image based on this prompt: "' + prompt + '". The description should be artistic and visual, suitable for an artist to create an image. Write the description in Arabic. Make it beautiful and inspiring. Keep it under 200 words.'
      });

      const description = response.text;

      logger.info('✅ Image description generated successfully');

      return {
        success: true,
        description: description
      };

    } catch (error) {
      logger.error('❌ Image generation error:', error.message);

      // Handle specific errors
      if (error.message && error.message.includes('quota')) {
        return {
          success: false,
          error: 'تم تجاوز حد الاستخدام اليومي. يرجى المحاولة لاحقاً.'
        };
      }

      if (error.message && (error.message.includes('invalid') || error.message.includes('key'))) {
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
      const messageText = ctx.message && ctx.message.text ? ctx.message.text : '';
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
      await ctx.reply('⏳ جاري توليد وصف الصورة...');

      // Generate image description
      const result = await this.generateImageDescription(args);

      if (result.success) {
        // Send the generated description
        await ctx.reply(
          '🎨 <b>وصف الصورة المولدة</b>\n\n' +
          '📝 <b>الوصف الأصلي:</b> ' + args + '\n\n' +
          '✨ <b>الوصف التفصيلي:</b>\n' + result.description + '\n\n' +
          '💡 <i>ملاحظة: هذا وصف تفصيلي للصورة. يمكنك استخدامه في أدوات توليد الصور الأخرى.</i>',
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply('❌ ' + result.error);
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
      if (!ctx.session || !ctx.session.awaitingImagePrompt) {
        return false;
      }

      // Clear the awaiting state
      ctx.session.awaitingImagePrompt = false;

      // Show typing indicator
      await ctx.reply('⏳ جاري توليد وصف الصورة...');

      // Generate image description
      const result = await this.generateImageDescription(prompt);

      if (result.success) {
        // Send the generated description
        await ctx.reply(
          '🎨 <b>وصف الصورة المولدة</b>\n\n' +
          '📝 <b>الوصف الأصلي:</b> ' + prompt + '\n\n' +
          '✨ <b>الوصف التفصيلي:</b>\n' + result.description + '\n\n' +
          '💡 <i>ملاحظة: هذا وصف تفصيلي للصورة. يمكنك استخدامه في أدوات توليد الصور الأخرى.</i>',
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply('❌ ' + result.error);
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
