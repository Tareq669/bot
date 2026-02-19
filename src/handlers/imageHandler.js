/**
 * Image Generator Handler
 * Handles image generation using Pollinations AI API (Free, no API key required)
 */

const { logger } = require('../utils/helpers');

// Simple state system using Set
const waitingForImagePrompt = new Set();

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
   * Check for inappropriate content in prompt
   * @param {string} prompt
   * @returns {boolean}
   */
  checkInappropriateContent(prompt) {
    const inappropriatePatterns = [
      /عاري/i, /جنس/i, /إباحي/i, /porn/i, /nude/i, /sex/i,
      /عنف/i, /دموي/i, /violent/i, /gore/i, /kill/i,
      /كراهية/i, /hate/i, /racist/i
    ];

    return inappropriatePatterns.some(pattern => pattern.test(prompt));
  }

  /**
   * Generate an image URL using Pollinations AI API
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

      if (!prompt || prompt.trim().length === 0) {
        return {
          success: false,
          error: 'يرجى إدخال وصف للصورة التي تريد توليدها.'
        };
      }

      if (prompt.length > 500) {
        return {
          success: false,
          error: 'الوصف طويل جداً. يرجى اختصاره إلى أقل من 500 حرف.'
        };
      }

      if (this.checkInappropriateContent(prompt)) {
        return {
          success: false,
          error: 'عذراً، لا يمكن توليد صور تحتوي على محتوى غير لائق.'
        };
      }

      logger.info(`🎨 Generating image for: ${prompt.substring(0, 50)}...`);

      // Generate image URL using Pollinations AI with random seed
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

      logger.info('✅ Image URL generated successfully');

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
   * Handle the image button press from Reply Keyboard
   * @param {TelegrafContext} ctx
   */
  async handleImageButton(ctx) {
    try {
      const userId = ctx.from.id;

      // Add user to waiting set
      waitingForImagePrompt.add(userId);

      // Reply to user asking for the prompt
      await ctx.reply(
        '🎨 اكتب وصف الصورة التي تريد توليدها\n\n' +
        'مثال: غروب الشمس على شاطئ استوائي',
        { parse_mode: 'HTML' }
      );

      logger.info(`User ${userId} is now waiting for image prompt`);

    } catch (error) {
      logger.error('Image button error:', error);
      await ctx.reply('❌ حدث خطأ. يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * Handle text message and check if user is waiting for image prompt
   * @param {TelegrafContext} ctx
   * @returns {Promise<boolean>} - True if handled, false otherwise
   */
  async handleTextMessage(ctx) {
    try {
      const userId = ctx.from.id;

      // Check if user is waiting for image prompt
      if (!waitingForImagePrompt.has(userId)) {
        return false;
      }

      // Remove user from waiting set
      waitingForImagePrompt.delete(userId);

      const prompt = ctx.message.text;

      // Show typing indicator
      await ctx.sendChatAction('upload_photo');
      await ctx.reply('⏳ جاري توليد الصورة...');

      // Generate image
      const result = await this.generateImage(prompt);

      if (result.success) {
        // Send the image directly
        await ctx.replyWithPhoto(result.imageUrl, {
          caption: `🎨 تم توليد الصورة بنجاح!\n\n📝 الوصف: ${prompt}`
        });
      } else {
        await ctx.reply(`❌ ${result.error}`);
      }

      return true;

    } catch (error) {
      logger.error('Image text handling error:', error);

      // Make sure to remove user from waiting set on error
      if (ctx.from && ctx.from.id) {
        waitingForImagePrompt.delete(ctx.from.id);
      }

      await ctx.reply('❌ حدث خطأ. يرجى المحاولة مرة أخرى.');
      return true;
    }
  }

  /**
   * Handle /image command (for direct command usage)
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
      await ctx.sendChatAction('upload_photo');
      await ctx.reply('⏳ جاري توليد الصورة...');

      // Generate image
      const result = await this.generateImage(args);

      if (result.success) {
        await ctx.replyWithPhoto(result.imageUrl, {
          caption: `🎨 تم توليد الصورة بنجاح!\n\n📝 الوصف: ${args}`
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
   * Check if user is waiting for image prompt
   * @param {number} userId
   * @returns {boolean}
   */
  isWaitingForImagePrompt(userId) {
    return waitingForImagePrompt.has(userId);
  }

  /**
   * Remove user from waiting set
   * @param {number} userId
   */
  clearWaitingState(userId) {
    waitingForImagePrompt.delete(userId);
  }
}

// Export singleton instance
const imageHandler = new ImageHandler();

module.exports = imageHandler;
