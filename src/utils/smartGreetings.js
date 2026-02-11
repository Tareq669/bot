const AIManager = require('../ai/aiManager');
const { User } = require('../database/models');

class SmartGreetings {
  // Smart welcome for new users
  static async handleNewUserWelcome(ctx) {
    try {
      const user = await User.findOne({ userId: ctx.from.id });
      if (!user || user.firstJoin) return;

      const welcomeMessage = `
🎉 <b>أهلاً وسهلاً!</b>

مرحباً ${ctx.from.first_name}! 👋

أنت الآن جزء من عائلتنا! 🌟

هذا البوت الذكي يقدم لك:
✨ محتوى إسلامي قيم
🎮 ألعاب ممتعة
💰 نظام اقتصادي
📊 إحصائيات متقدمة
🤖 ذكاء اصطناعي كامل

استخدم الأزرار أسفل الشاشة للبدء! 🚀

اختر من القائمة:
🕌 الختمة  |  📿 الأذكار
📖 القرآن  |  💭 الاقتباسات
✍️ الشعر  |  🎮 الألعاب
💰 الاقتصاد  |  👤 حسابي
🏆 المتصدرين  |  ⚙️ الإعدادات

إن شاء الله بتستمتع! 💚`;

      await ctx.reply(welcomeMessage, {
        parse_mode: 'HTML',
        reply_markup: require('./keyboards').UIManager.mainReplyKeyboard().reply_markup
      });

      user.firstJoin = false;
      await user.save();
    } catch (error) {
      console.error('Welcome error:', error);
    }
  }

  // Motivational message for inactive users
  static async sendMotivationalMessage(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return;

      const motivation = await AIManager.getPersonalizedRecommendation(userId);

      // This would be called by a scheduler or trigger
      return motivation;
    } catch (error) {
      console.error('Motivation error:', error);
    }
  }

  // Smart daily messages
  static generateDailyMessage(user) {
    const hour = new Date().getHours();
    const messages = [];

    if (hour >= 5 && hour < 12) {
      messages.push(`☀️ <b>صباح الخير</b> ${user.firstName}!\n\nبداية يوم جديد = فرص جديدة! 🌟\n\nهيا ابدأ يومك مع البوت! 🚀`);
    } else if (hour >= 12 && hour < 17) {
      messages.push(`🌤️ <b>ظهر الخير</b> ${user.firstName}!\n\nهل أخذت مكافأتك اليومية؟ 🎁\n\nجرب لعبة جديدة! 🎮`);
    } else if (hour >= 17 && hour < 21) {
      messages.push(`🌅 <b>مساء الخير</b> ${user.firstName}!\n\nحان وقت الاسترخاء والقراءة! 📖\n\nاقرأ بعض الآيات القرآنية! 🕌`);
    } else {
      messages.push(`🌙 <b>ليل الخير</b> ${user.firstName}!\n\nوقت السكينة والتأمل! 🌙\n\nاقرأ الأذكار قبل النوم! 📿`);
    }

    return messages[0];
  }
}

module.exports = SmartGreetings;
