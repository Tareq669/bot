/**
 * Image Generator Handler
 * Handles image generation using Pollinations AI API (Free, no API key required)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/helpers');

class ImageHandler {
  constructor() {
    this.isInitialized = true;
    this.tempDir = path.join(__dirname, '../../temp');
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    
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
   * Download image from URL and save to temp file
   * @param {string} url - Image URL
   * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
   */
  async downloadImage(url) {
    return new Promise((resolve) => {
      const https = require('https');
      const http = require('http');
      const filename = `image_${Date.now()}.png`;
      const filepath = path.join(this.tempDir, filename);
      const file = fs.createWriteStream(filepath);

      const protocol = url.startsWith('https') ? https : http;

      const request = protocol.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/png,image/jpeg,image/webp,*/*',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          file.close();
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
          if (redirectUrl) {
            this.downloadImage(redirectUrl).then(resolve);
          } else {
            resolve({ success: false, error: 'Redirect without location' });
          }
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
          resolve({ success: false, error: `HTTP ${response.statusCode}` });
          return;
        }

        response.pipe(file);

        file.on('finish', () => {
          file.close();
          // Verify file exists and has content
          const stats = fs.statSync(filepath);
          if (stats.size > 0) {
            resolve({ success: true, filePath: filepath });
          } else {
            fs.unlinkSync(filepath);
            resolve({ success: false, error: 'Empty file downloaded' });
          }
        });
      });

      request.on('error', (err) => {
        file.close();
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        resolve({ success: false, error: err.message });
      });

      request.setTimeout(60000, () => {
        request.destroy();
        file.close();
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
        resolve({ success: false, error: 'Request timeout' });
      });
    });
  }

  /**
   * Generate an image using Pollinations AI API
   * @param {string} prompt - Text description for image generation
   * @returns {Promise<{success: boolean, filePath?: string, error?: string, enhancedPrompt?: string}>}
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

      logger.info('✅ Image generated successfully');

      return {
        success: true,
        imageUrl: imageUrl,
        enhancedPrompt: prompt
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
   * Handle /image command
   * @param {TelegrafContext} ctx
   */
  async handleImageCommand(ctx) {
    let tempFile = null;
    
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

      // Generate image URL
      const result = await this.generateImage(args);

      if (result.success) {
        // Try sending photo from URL
        try {
          await ctx.replyWithPhoto(result.imageUrl, {
            caption: `✨ <b>تم التوليد بواسطة الذكاء الاصطناعي</b>\n\n📝 <b>الوصف:</b> ${result.enhancedPrompt}`,
            parse_mode: 'HTML'
          });
        } catch (photoError) {
          // If URL fails, send link
          logger.error('Photo send error:', photoError.message);
          const { Markup } = require('telegraf');
          await ctx.reply(
            `✨ <b>تم التوليد بواسطة الذكاء الاصطناعي</b>\n\n` +
            `📝 <b>الوصف:</b> ${result.enhancedPrompt}\n\n` +
            `🔗 <a href="${result.imageUrl}">اضغط هنا لفتح الصورة</a>`,
            { parse_mode: 'HTML' }
          );
        }
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
          parse_mode: 'HTML'
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
    let tempFile = null;
    
    try {
      if (!ctx.session || !ctx.session.awaitingImagePrompt) {
        return false;
      }

      // Clear the awaiting state
      ctx.session.awaitingImagePrompt = false;

      // Show typing indicator
      await ctx.sendChatAction('upload_photo');
      await ctx.reply('⏳ جاري توليد الصورة...');

      // Generate image URL
      const result = await this.generateImage(prompt);

      if (result.success) {
        // Try sending photo from URL
        try {
          await ctx.replyWithPhoto(result.imageUrl, {
            caption: `✨ <b>تم التوليد بواسطة الذكاء الاصطناعي</b>\n\n📝 <b>الوصف:</b> ${result.enhancedPrompt}`,
            parse_mode: 'HTML'
          });
        } catch (photoError) {
          // If URL fails, send link
          logger.error('Photo send error:', photoError.message);
          const { Markup } = require('telegraf');
          await ctx.reply(
            `✨ <b>تم التوليد بواسطة الذكاء الاصطناعي</b>\n\n` +
            `📝 <b>الوصف:</b> ${result.enhancedPrompt}\n\n` +
            `🔗 <a href="${result.imageUrl}">اضغط هنا لفتح الصورة</a>`,
            { parse_mode: 'HTML' }
          );
        }
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
      [Markup.button.callback('🎨 توليد صورة جديدة', 'image:generate')],
      [Markup.button.callback('⬅️ رجوع', 'menu:main')]
    ]);
  }
}

// Export singleton instance
const imageHandler = new ImageHandler();

module.exports = imageHandler;
