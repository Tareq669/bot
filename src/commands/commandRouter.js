/**
 * مدير توجيه الأوامر - Command Router
 *
 * هذا الملف يقوم بتوجيه الأوامر بناءً على نوع المحادثة:
 * - المحادثات الخاصة (Private): أوامر الأذكار، القرآن، الاقتصاد العام، etc.
 * - المجموعات (Group/Supergroup): أوامر الحماية، المستويات، الاقتصاد، الألعاب، etc.
 *
 * الميزات:
 * - فحص نوع المحادثة
 * - توجيه الأوامر للـ handler المناسب
 * - منع أوامر المجموعات في الخاص
 * - منع أوامر الخاص في المجموعات
 */

class CommandRouter {
  /**
   * أوامر المجموعات فقط (لا تعمل في الخاص)
   */
  static GROUP_ONLY_COMMANDS = [
    // لوحة التحكم
    'panel', 'لوحة', 'settings', 'الإعدادات', 'stats', 'إحصائيات',
    'invitelink', 'رابط_الدعوة',

    // الحماية
    'حماية', 'حماية_تشغيل', 'حماية_إيقاف', 'antiflood', 'antiflood_تشغيل',
    'antiflood_إيقاف', 'antilink', 'antilink_تشغيل', 'antilink_إيقاف',
    'antibot', 'antibot_تشغيل', 'antibot_إيقاف', 'antihashtag',
    'antihashtag_تشغيل', 'antihashtag_إيقاف', 'antispam', 'antispam_تشغيل',
    'antispam_إيقاف', 'الصلاحيات', 'صلاحيات', 'كشف_الSpam', 'قفل_الدردشة',
    'فتح_الدردشة', 'قفل_الوسائط', 'فتح_الوسائط', 'رفع_القيود',

    // المستويات
    'level', 'xp', 'top', 'top10', 'rank', 'لقبي', 'تعيين_لقب',
    'daily',

    // اقتصاد المجموعة
    'bank', 'deposit', 'withdraw', 'pay', 'shop', 'buy', 'additem',
    'removeitem', 'buytitle', 'رصيد', 'بنك', 'إيداع', 'سحب', 'تحويل',
    'متجر', 'شراء', 'إضافة_عنصر', 'حذف_عنصر', 'شراء_لقب',

    // الألعاب
    'tictactoe', 'xo', 'م子的游戏', 'word', 'كلمة', 'guess', 'تخمين',
    'riddle', 'لغز', 'trivia', 'أسئلة', 'slots', 'سلوت', 'dice',
    'نرد', 'basketball', 'كرة_السلة', 'football', 'كرة_القدم',
    'bowling', 'بولينج', 'quiz', 'اختبار', 'memory', 'ذاكرة',
    'cancer', 'سرطان', 'rps', 'حجرة_ورقة_مقص',

    // القواعد والترحيب
    'قواعد', 'تعيين_قواعد', 'مسح_القواعد', 'طلب_قبول', 'ترحيب',
    'وداع', 'ترحيب_تشغيل', 'ترحيب_إيقاف', 'وداع_تشغيل', 'وداع_إيقاف',

    // التحذيرات
    'تحذير', 'رفع_تحذير', 'تحذيراتي', 'تحذيرات', 'مسح_التحذيرات',
    'حد_التحذيرات', 'اجراء_تلقائي',

    // الردود الذكية
    'رد', 'إضافة_رد', 'حذف_رد', 'قائمة_الردود',

    // إحصائيات ومتقدم
    'membercount', 'عدد_الأعضاء', 'admins', 'الادمينة', 'botinfo', 'معلومات_البوت',
    'pin', 'تثبيت', 'unpin', 'إلغاء_التثبيت', 'ban', 'kick', 'unban',
    'mute', 'unmute', 'del', 'مسح'
  ];

  /**
   * أوامر الخاص فقط (لا تعمل في المجموعات)
   */
  static PRIVATE_ONLY_COMMANDS = [
    // الأذكار والقرآن
    'adhkar', 'أذكار', 'quran', 'قرآن', 'khatma', 'ختمة',

    // الاقتصاد العام
    'balance', 'leaderboard', 'daily', 'economy', 'transfer',

    // الملفات الشخصية
    'profile', 'goals', 'charity', 'memorization', 'dua',
    'referral', 'events', 'library', 'teams', 'features'
  ];

  /**
   * فحص نوع المحادثة وتوجيه الأمر
   */
  static async routeCommand(ctx, command, handler) {
    const chatType = ctx.chat.type;
    const commandLower = command.toLowerCase();

    // فحص نوع المحادثة
    if (chatType === 'private') {
      return this.handlePrivateCommand(ctx, command, handler);
    } else if (chatType === 'group' || chatType === 'supergroup') {
      return this.handleGroupCommand(ctx, command, handler);
    }

    // إذا كان نوع المحادثة غير معروف، اسمح بتنفيذ الأمر
    return handler(ctx);
  }

  /**
   * معالجة أوامر الخاص
   */
  static async handlePrivateCommand(ctx, command, handler) {
    const commandLower = command.toLowerCase();

    // فحص إذا كان الأمر مخصص للمجموعات فقط
    if (this.isGroupOnlyCommand(commandLower)) {
      await ctx.reply(
        '❌ <b>هذا الأمر مخصص للمجموعات فقط!</b>\n\n' +
        '📌 استخدم هذا الأمر داخل مجموعة لتفعيل ميزات الإدارة والتفاعل.\n\n' +
        '💡 <b>الأوامر المتاحة لك في الخاص:</b>\n' +
        '• /adhkar - الأذكار\n' +
        '• /quran - القرآن\n' +
        '• /khatma - الختمة\n' +
        '• /profile - ملفك الشخصي\n' +
        '• /balance - رصيدك\n' +
        '• /daily - المكافأة اليومية\n' +
        '• /games - الألعاب\n' +
        '• /leaderboard - المتصدرين',
        { parse_mode: 'HTML' }
      );
      return false;
    }

    // تنفيذ الأمر
    return handler(ctx);
  }

  /**
   * معالجة أوامر المجموعات
   */
  static async handleGroupCommand(ctx, command, handler) {
    const commandLower = command.toLowerCase();

    // فحص إذا كان الأمر مخصص للخاص فقط
    if (this.isPrivateOnlyCommand(commandLower)) {
      await ctx.reply(
        '❌ <b>هذا الأمر مخصص للخاص فقط!</b>\n\n' +
        '📌 استخدم هذا الأمر في المحادثة الخاصة مع البوت.\n\n' +
        '💡 <b>الأوامر المتاحة لك في المجموعة:</b>\n' +
        '• /panel - لوحة التحكم\n' +
        '• /level - مستواك\n' +
        '• /balance - رصيدك في المجموعة\n' +
        '• /stats - إحصائيات المجموعة\n' +
        '• /rules - القواعد\n' +
        '• /help - المساعدة',
        { parse_mode: 'HTML' }
      );
      return false;
    }

    // تنفيذ الأمر
    return handler(ctx);
  }

  /**
   * فحص إذا كان الأمر للمجموعات فقط
   */
  static isGroupOnlyCommand(command) {
    return this.GROUP_ONLY_COMMANDS.some(cmd =>
      cmd.toLowerCase() === command || cmd === command
    );
  }

  /**
   * فحص إذا كان الأمر للخاص فقط
   */
  static isPrivateOnlyCommand(command) {
    return this.PRIVATE_ONLY_COMMANDS.some(cmd =>
      cmd.toLowerCase() === command || cmd === command
    );
  }

  /**
   * إنشاء معالج أوامر مع توجيه
   * يُستخدم لتسجيل الأوامر مع فحص نوع المحادثة
   */
  static createGuardedCommand(bot, command, handler) {
    bot.command(command, async (ctx) => {
      await this.routeCommand(ctx, command, handler);
    });
  }

  /**
   * إنشاء معالج أوامر متعددة مع توجيه
   */
  static createGuardedCommands(bot, commands) {
    for (const { command, handler } of commands) {
      this.createGuardedCommand(bot, command, handler);
    }
  }

  /**
   * الحصول على قائمة الأوامر المتاحة للمحادثة الحالية
   */
  static async getAvailableCommands(ctx) {
    const chatType = ctx.chat.type;

    if (chatType === 'private') {
      return this.PRIVATE_ONLY_COMMANDS.filter(cmd =>
        !this.GROUP_ONLY_COMMANDS.includes(cmd)
      );
    } else if (chatType === 'group' || chatType === 'supergroup') {
      return this.GROUP_ONLY_COMMANDS.filter(cmd =>
        !this.PRIVATE_ONLY_COMMANDS.includes(cmd)
      );
    }

    return [...this.PRIVATE_ONLY_COMMANDS, ...this.GROUP_ONLY_COMMANDS];
  }

  /**
   * التحقق من صلاحية الأمر في المحادثة الحالية
   */
  static async validateCommand(ctx, command) {
    const chatType = ctx.chat.type;
    const commandLower = command.toLowerCase();

    if (chatType === 'private') {
      if (this.isGroupOnlyCommand(commandLower)) {
        return {
          valid: false,
          message: 'هذا الأمر مخصص للمجموعات فقط'
        };
      }
    } else if (chatType === 'group' || chatType === 'supergroup') {
      if (this.isPrivateOnlyCommand(commandLower)) {
        return {
          valid: false,
          message: 'هذا الأمر مخصص للخاص فقط'
        };
      }
    }

    return { valid: true };
  }
}

module.exports = CommandRouter;
