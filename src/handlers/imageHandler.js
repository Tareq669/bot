/**
 * Image Generator Handler
 * Handles image generation using Pollinations AI API (Free, no API key required)
 */

const { logger } = require('../utils/helpers');
const https = require('https');

class ImageHandler {
  constructor() {
    this.isInitialized = true;
    logger.info('✅ Image Generator initialized successfully with Pollinations AI');
  }

  /**
   * Check if the service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.isInitialized;
  }

  /**
   * Generate an image using Pollinations AI API
   * @param {string} prompt - Text description for image generation
   * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
   */
  async generateImage(prompt) {
    try {
      if (!this.isAvailable()) {
        return {
          success: false,
          error: 'خدمة توليد الصور غير متاحة حالياً.'
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

      logger.info(`🎨 Generating image for: ${prompt.substring(0, 50)}...`);

      // Encode the prompt for URL
      const encodedPrompt = encodeURIComponent(prompt);

      // Generate image URL using Pollinations AI
      // Using a random seed to get different images for the same prompt
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

      logger.info('✅ Image generated successfully');

      return {
        success: true,
        imageUrl: imageUrl
      };

    } catch (error) {
      logger.error('❌ Image generation error:', error.message);

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
      await ctx.reply('⏳ جاري توليد الصورة...');

      // Generate image
      const result = await this.generateImage(args);

      if (result.success) {
        // Send the generated image directly using replyWithPhoto
        await ctx.replyWithPhoto(result.imageUrl, {
          caption: `🎨 <b>الصورة المولدة</b>\n\n📝 <b>الوصف:</b> ${args}\n\n💡 <i>تم التوليد بواسطة Pollinations AI</i>`,
          parse_mode: 'HTML'
        });
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
      if (!ctx.session || !ctx.session.awaitingImagePrompt) {
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
        await ctx.replyWithPhoto(result.imageUrl, {
          caption: `🎨 <b>الصورة المولدة</b>\n\n📝 <b>الوصف:</b> ${prompt}\n\n💡 <i>تم التوليد بواسطة Pollinations AI</i>`,
          parse_mode: 'HTML'
        });
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
