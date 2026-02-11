/**
 * Multi-Language Support System
 * نظام دعم اللغات المتعددة
 */

const { logger } = require('../utils/helpers');
const User = require('../database/models/User');

class LanguageManager {
  constructor() {
    this.languages = {
      ar: {
        name: '🇸🇦 العربية',
        flag: 'ar',
        translations: this.getArabicTranslations()
      },
      en: {
        name: '🇺🇸 English',
        flag: 'en',
        translations: this.getEnglishTranslations()
      },
      fr: {
        name: '🇫🇷 Français',
        flag: 'fr',
        translations: this.getFrenchTranslations()
      }
    };
  }

  /**
   * الترجمات العربية
   */
  getArabicTranslations() {
    return {
      welcome: 'مرحباً بك في البوت الإسلامي! 🕌',
      start: 'اختر خياراً من القائمة أدناه:',
      help: 'هل تحتاج إلى مساعدة؟',
      profile: '👤 حسابي',
      games: '🎮 الألعاب',
      adhkar: '📿 الأذكار',
      quran: '📖 القرآن',
      economy: '💰 الاقتصاد',
      leaderboard: '🏆 المتصدرين',
      settings: '⚙️ الإعدادات',
      language: '🌐 اللغة',
      error: '❌ حدث خطأ',
      success: '✅ تم بنجاح',
      invalid_input: '❌ إدخال غير صحيح',
      more: '📖 المزيد',
      back: '⬅️ رجوع',
      next: '➡️ التالي',
      previous: '⬅️ السابق',
      shop: '🛍️ المتجر',
      achievements: '🏅 الإنجازات',
      notifications: '🔔 الإشعارات'
    };
  }

  /**
   * الترجمات الإنجليزية
   */
  getEnglishTranslations() {
    return {
      welcome: 'Welcome to the Islamic Bot! 🕌',
      start: 'Choose an option from the menu below:',
      help: 'Need help?',
      profile: '👤 My Profile',
      games: '🎮 Games',
      adhkar: '📿 Remembrance',
      quran: '📖 Quran',
      economy: '💰 Economy',
      leaderboard: '🏆 Leaderboard',
      settings: '⚙️ Settings',
      language: '🌐 Language',
      error: '❌ An error occurred',
      success: '✅ Done successfully',
      invalid_input: '❌ Invalid input',
      more: '📖 More',
      back: '⬅️ Back',
      next: '➡️ Next',
      previous: '⬅️ Previous',
      shop: '🛍️ Shop',
      achievements: '🏅 Achievements',
      notifications: '🔔 Notifications'
    };
  }

  /**
   * الترجمات الفرنسية
   */
  getFrenchTranslations() {
    return {
      welcome: 'Bienvenue dans le bot islamique! 🕌',
      start: 'Choisissez une option dans le menu ci-dessous:',
      help: 'Besoin d\'aide?',
      profile: '👤 Mon Profil',
      games: '🎮 Jeux',
      adhkar: '📿 Zikr',
      quran: '📖 Coran',
      economy: '💰 Économie',
      leaderboard: '🏆 Classement',
      settings: '⚙️ Paramètres',
      language: '🌐 Langue',
      error: '❌ Une erreur s\'est produite',
      success: '✅ Succès',
      invalid_input: '❌ Entrée invalide',
      more: '📖 Plus',
      back: '⬅️ Retour',
      next: '➡️ Suivant',
      previous: '⬅️ Précédent',
      shop: '🛍️ Boutique',
      achievements: '🏅 Réalisations',
      notifications: '🔔 Notifications'
    };
  }

  /**
   * الحصول على اللغة المفضلة للمستخدم
   */
  async getUserLanguage(userId) {
    try {
      const user = await User.findById(userId);
      return user?.language || 'ar'; // العربية افتراضياً
    } catch (error) {
      logger.error(`خطأ في الحصول على لغة المستخدم: ${error.message}`);
      return 'ar';
    }
  }

  /**
   * تعيين لغة المستخدم
   */
  async setUserLanguage(userId, languageCode) {
    try {
      if (!this.languages[languageCode]) {
        return { success: false, message: 'اللغة غير مدعومة' };
      }

      await User.findByIdAndUpdate(userId, { language: languageCode });
      logger.info(`🌐 تم تغيير لغة المستخدم ${userId} إلى ${languageCode}`);

      return {
        success: true,
        message: `✅ تم تغيير اللغة إلى ${this.languages[languageCode].name}`
      };
    } catch (error) {
      logger.error(`خطأ في تعيين اللغة: ${error.message}`);
      return { success: false, message: 'حدث خطأ' };
    }
  }

  /**
   * الحصول على ترجمة
   */
  async translate(userId, key) {
    const language = await this.getUserLanguage(userId);
    const translations = this.languages[language].translations;
    return translations[key] || translations['error'] || 'Error';
  }

  /**
   * عرض قائمة اللغات
   */
  getLanguagesMenu() {
    let text = '🌐 <b>اختر اللغة / Choose Language / Choisir Langue</b>\n\n';

    for (const [code, lang] of Object.entries(this.languages)) {
      text += `${lang.name}\n`;
    }

    text += '\n💡 <i>سيتم تطبيق اللغة على جميع الرسائل</i>';
    return text;
  }

  /**
   * معلومات اللغة
   */
  getLanguageInfo(languageCode) {
    const lang = this.languages[languageCode];
    if (!lang) return null;

    return {
      code: languageCode,
      name: lang.name,
      translations: Object.keys(lang.translations).length
    };
  }

  /**
   * الحصول على كل اللغات المدعومة
   */
  getSupportedLanguages() {
    return Object.entries(this.languages).map(([code, lang]) => ({
      code,
      name: lang.name,
      flag: lang.flag
    }));
  }

  /**
   * إضافة لغة جديدة
   */
  addLanguage(code, name, translations) {
    if (this.languages[code]) {
      return { success: false, message: 'اللغة موجودة بالفعل' };
    }

    this.languages[code] = {
      name,
      flag: code,
      translations
    };

    logger.info(`✅ تمت إضافة لغة جديدة: ${name}`);
    return { success: true, message: `تمت إضافة اللغة: ${name}` };
  }

  /**
   * ترجمة نص كامل
   */
  translateMessage(message, fromLanguage = 'ar', toLanguage = 'en') {
    // هذا يمكن تحسينه باستخدام API ترجمة خارجي مثل Google Translate
    // للآن نعيد نفس النص مع تنبيه أنه مترجم
    return `[${toLanguage.toUpperCase()}]\n${message}`;
  }

  /**
   * إحصائيات اللغات
   */
  async getLanguageStats() {
    try {
      const users = await User.find({}, { language: 1 });
      const stats = {};

      users.forEach(user => {
        const lang = user.language || 'ar';
        stats[lang] = (stats[lang] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error(`خطأ في إحصائيات اللغات: ${error.message}`);
      return {};
    }
  }

  /**
   * تنسيق الإحصائيات
   */
  async formatLanguageStats() {
    const stats = await this.getLanguageStats();
    let text = '📊 <b>إحصائيات اللغات</b>\n\n';

    for (const [code, count] of Object.entries(stats)) {
      const lang = this.languages[code];
      if (lang) {
        text += `${lang.name}: ${count} مستخدم\n`;
      }
    }

    return text;
  }
}

module.exports = LanguageManager;
