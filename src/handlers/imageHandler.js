/**
 * Image Generator Handler
 * Uses Hugging Face Inference API for image generation
 */

const fetch = require('node-fetch');
const { logger } = require('../utils/helpers');

// Simple state system using Set
const waitingForImagePrompt = new Set();

class ImageHandler {
  constructor() {
    this.isInitialized = true;
    this.hfToken = process.env.HF_TOKEN;

    if (!this.hfToken) {
      logger.warn('⚠️ HF_TOKEN not found in environment variables');
    } else {
      logger.info('✅ Image Generator initialized with Hugging Face');
    }
  }

  /**
   * Check if the service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.isInitialized && !!this.hfToken;
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
   * Retry helper function
   * @param {Function} fn - Function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @param {number} delay - Delay between retries in ms
   * @returns {Promise}
   */
  async retryWithBackoff(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        logger.warn(`Retry ${i + 1}/${maxRetries} failed:`, error.message);
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Generate an image using Hugging Face API
   * @param {string} prompt - Text description for image generation
   * @returns {Promise<{success: boolean, buffer?: Buffer, error?: string}>}
   */
  async generateImageBuffer(prompt) {
    try {
      if (!this.isAvailable()) {
        return { success: false, error: 'خدمة توليد الصور غير متاحة. يرجى إضافة HF_TOKEN.' };
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

      // Hugging Face Inference API call
      const hfGenerateImage = async () => {
        const response = await fetch(
          'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.hfToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: prompt })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HF API error: ${response.status} - ${errorText}`);
        }

        // Get array buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (!buffer || buffer.length === 0) {
          throw new Error('Empty response from Hugging Face');
        }

        return buffer;
      };

      // Retry up to 3 times with 1 second delay
      const buffer = await this.retryWithBackoff(hfGenerateImage, 3, 1000);

      logger.info('✅ Image generated successfully');
      return { success: true, buffer: buffer };

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
      if (!this.isAvailable()) {
        await ctx.reply('❌ خدمة توليد الصور غير متاحة. يرجى إضافة HF_TOKEN في إعدادات البوت.');
        return;
      }

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

      // Generate image
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
      if (!this.isAvailable()) {
        await ctx.reply('❌ خدمة توليد الصور غير متاحة. يرجى إضافة HF_TOKEN في إعدادات البوت.');
        return;
      }

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

      // Generate image
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
