/**
 * Image Generator Handler
 * Handles image generation using Pollinations AI API (Free, no API key required)
 */

const fetch = require('node-fetch');
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
   * Generate an image and return as Buffer
   * @param {string} prompt - Text description for image generation
   * @returns {Promise<{success: boolean, buffer?: Buffer, error?: string}>}
   */
  async generateImageBuffer(prompt) {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'خدمة توليد الصور غير متاحة حالياً.' };
      }

      if (!prompt || prompt.trim().length === 0) {
        return { success: false, error: 'يرجى إدخال وصف للصورة.' };
      }

      if (prompt.length > 500) {
        return { success: false, error: 'الوصف طويل جداً.' };
      }

      if (this.checkInappropriateContent(prompt)) {
        return { success: false, error: 'عذراً، لا يمكن توليد هذا المحتوى.' };
      }

      logger.info(`🎨 Generating image for: ${prompt.substring(0, 30)}...`);

      // Generate image URL matching n8n workflow format
      const seed = Math.floor(Math.random() * 1000000);
      const width = 1080;
      const height = 1920;
      const model = 'flux';

      // Build URL with all parameters like n8n workflow
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&model=${model}&seed=${seed}&nologo=true`;

      // Fetch image as buffer
      const response = await fetch(imageUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/png,image/jpeg,image/webp,*/*',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        logger.error(`❌ Fetch failed: ${response.status}`);
        return { success: false, error: 'فشل في تحميل الصورة.' };
      }

      const buffer = await response.buffer();

      if (!buffer || buffer.length === 0) {
        return { success: false, error: 'الصورة فارغة.' };
      }

      logger.info('✅ Image generated successfully');
      return { success: true, buffer: buffer };

    } catch (error) {
      logger.error('❌ Image generation error:', error.message);
      return { success: false, error: 'حدث خطأ. يرجى المحاولة مرة أخرى.' };
    }
  }

  /**
   * Generate an image URL using Pollinations AI API
   * @param {string} prompt - Text description for image generation
   * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
   */
  async generateImage(prompt) {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'خدمة توليد الصور غير متاحة حالياً.' };
      }

      if (!prompt || prompt.trim().length === 0) {
        return { success: false, error: 'يرجى إدخال وصف للصورة.' };
      }

      if (prompt.length > 500) {
        return { success: false, error: 'الوصف طويل جداً.' };
      }

      if (this.checkInappropriateContent(prompt)) {
        return { success: false, error: 'عذراً، لا يمكن توليد هذا المحتوى.' };
      }

      logger.info(`🎨 Generating image for: ${prompt.substring(0, 30)}...`);

      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;

      logger.info('✅ Image URL generated');
      return { success: true, imageUrl: imageUrl };

    } catch (error) {
      logger.error('❌ Image generation error:', error.message);
      return { success: false, error: 'حدث خطأ. يرجى المحاولة مرة أخرى.' };
    }
  }

  /**
   * Handle the image button press from Reply Keyboard
   * @param {TelegrafContext} ctx
   */
  async handleImageButton(ctx) {
    try {
      const userId = ctx.from.id;
      waitingForImagePrompt.add(userId);

      await ctx.reply(
        '🎨 اكتب وصف الصورة التي تريد توليدها\n\nمثال: غروب الشمس على شاطئ استوائي'
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
   * @returns {Promise<boolean>}
   */
  async handleTextMessage(ctx) {
    try {
      const userId = ctx.from.id;

      if (!waitingForImagePrompt.has(userId)) {
        return false;
      }

      waitingForImagePrompt.delete(userId);

      const prompt = ctx.message.text;

      await ctx.sendChatAction('upload_photo');
      await ctx.reply('⏳ جاري توليد الصورة...');

      // Generate image as buffer
      const result = await this.generateImageBuffer(prompt);

      if (result.success) {
        // Send the image directly with buffer
        await ctx.replyWithPhoto({ source: result.buffer, filename: 'image.png' }, {
          caption: `🎨 تم توليد الصورة بنجاح!\n\n📝 الوصف: ${prompt}`
        });
      } else {
        await ctx.reply(`❌ ${result.error}`);
      }

      return true;

    } catch (error) {
      logger.error('Image text handling error:', error);

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
          '• /image قطة لطيفة ترتدي نظارة شمسية\n\n' +
          '⚠️ <i>ملاحظة: لا يمكن توليد صور غير لائقة</i>',
          { parse_mode: 'HTML' }
        );
        return;
      }

      await ctx.sendChatAction('upload_photo');
      await ctx.reply('⏳ جاري توليد الصورة...');

      // Generate image as buffer
      const result = await this.generateImageBuffer(args);

      if (result.success) {
        await ctx.replyWithPhoto({ source: result.buffer, filename: 'image.png' }, {
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
