/**
 * نظام اقتصاد المجموعات
 * Group Economy System
 *
 * الميزات:
 * - متجر المجموعة (عناصر، ألقاب، صلاحيات)
 * - شراء ألقاب مخصصة
 * - شراء صلاحيات مؤقتة
 * - تحويل العملات بين الأعضاء
 * - نظام بنكي (إيداع، سحب، فائدة)
 */

const { GroupMember, GroupShop } = require('../database/models');

// إعدادات النظام
const CONFIG = {
  // الفائدة البنكية اليومية (بالنسبة المئوية)
  DAILY_BANK_INTEREST: 0.5,
  // الحد الأدنى للإيداع للحصول على الفائدة
  MIN_DEPOSIT_FOR_INTEREST: 100,
  // الحد الأقصى للرصيد في البنك
  MAX_BANK_BALANCE: 1000000,
  // الحد الأدنى للتحويل
  MIN_TRANSFER: 1,
  // رسم التحويل (بالنسبة المئوية)
  TRANSFER_FEE: 0,
  // سعر اللقب الافتراضي
  DEFAULT_TITLE_PRICE: 500,
  // أسعار الصلاحيات
  PERMISSION_PRICES: {
    can_send_messages: 100,    // ساعة واحدة
    can_use_commands: 150,
    can_send_media: 200,
    can_add_members: 250
  },
  // ساعات كل صلاحية
  PERMISSION_DURATIONS: {
    can_send_messages: 24,
    can_use_commands: 12,
    can_send_media: 24,
    can_add_members: 24
  }
};

/**
 * التحقق من أن الأمر في مجموعة
 */
function isGroupChat(ctx) {
  return ctx.chat && ctx.chat.type !== 'private';
}

/**
 * الحصول على عضو المجموعة أو إنشاء جديد
 */
async function getOrCreateMember(groupId, userId) {
  let member = await GroupMember.findOne({ groupId, userId });

  if (!member) {
    member = new GroupMember({
      groupId,
      userId,
      xp: 0,
      level: 1,
      coins: 0,
      title: 'مستخدم جديد',
      messagesCount: 0,
      dailyStreak: 0,
      bankBalance: 0,
      bankDepositsTotal: 0
    });
    await member.save();
  }

  return member;
}

/**
 * التحقق من صلاحية المشرف
 */
async function isAdmin(ctx, groupId, userId) {
  try {
    const chatMember = await ctx.telegram.getChatMember(groupId, userId);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch (error) {
    return false;
  }
}

// ============================================
// أوامر العرض
// ============================================

/**
 * عرض رصيد العملات
 */
async function showBalance(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const member = await getOrCreateMember(groupId, userId);

    const message = '💰 *رصيدك من العملات*\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      `💵 الرصيد المتاح: *${member.coins}* Coins\n` +
      `🏦 رصيد البنك: *${member.bankBalance}* Coins\n` +
      `📊 إجمالي الإيداعات: *${member.bankDepositsTotal}* Coins\n` +
      '━━━━━━━━━━━━━━━━━━\n' +
      '💡 استخدم /deposit لإيداع money في البنك\n' +
      '💡 استخدم /withdraw لسحب money من البنك';

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في عرض الرصيد:', error);
    await ctx.reply('❌ حدث خطأ في عرض الرصيد.');
  }
}

/**
 * عرض معلومات البنك
 */
async function showBank(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const member = await getOrCreateMember(groupId, userId);

    // حساب الفائدة المتوقعة
    let expectedInterest = 0;
    if (member.bankBalance >= CONFIG.MIN_DEPOSIT_FOR_INTEREST) {
      expectedInterest = Math.floor(member.bankBalance * (CONFIG.DAILY_BANK_INTEREST / 100));
    }

    const message = '🏦 *مصرف المجموعة*\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      `💰 رصيدك: *${member.bankBalance}* Coins\n` +
      `📊 إجمالي ما أودعته: *${member.bankDepositsTotal}* Coins\n` +
      '━━━━━━━━━━━━━━━━━━\n' +
      `📈 الفائدة اليومية: *${CONFIG.DAILY_BANK_INTEREST}٪*\n` +
      `💡 الفائدة المتوقعة: *${expectedInterest}* Coins\n` +
      '━━━━━━━━━━━━━━━━━━\n' +
      '💡 *الأوامر:*\n' +
      '/deposit [المبلغ] - إيداع\n' +
      '/withdraw [المبلغ] - سحب\n' +
      '━━━━━━━━━━━━━━━━━━\n' +
      `⚠️ الحد الأقصى للرصيد: ${CONFIG.MAX_BANK_BALANCE.toLocaleString()} Coins`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في عرض البنك:', error);
    await ctx.reply('❌ حدث خطأ في عرض معلومات البنك.');
  }
}

// ============================================
// أوامر البنك
// ============================================

/**
 * إيداع في البنك
 */
async function deposit(ctx, amount) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  if (!amount || amount <= 0) {
    await ctx.reply('❌ يرجى إدخال مبلغ صحيح!\nمثال: /deposit 100');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const member = await getOrCreateMember(groupId, userId);

    if (member.coins < amount) {
      await ctx.reply(`❌ رصيدك غير كافٍ!\n💰 رصيدك المتاح: ${member.coins} Coins`);
      return;
    }

    // التحقق من الحد الأقصى
    if (member.bankBalance + amount > CONFIG.MAX_BANK_BALANCE) {
      const maxDeposit = CONFIG.MAX_BANK_BALANCE - member.bankBalance;
      await ctx.reply(`❌ تجاوزت الحد الأقصى للبنك!\n💡Maximum الإيداع المسموح: ${maxDeposit} Coins`);
      return;
    }

    // إجراء الإيداع
    member.coins -= amount;
    member.bankBalance += amount;
    member.bankDepositsTotal += amount;
    await member.save();

    await ctx.reply('✅ *تم الإيداع بنجاح!*\n\n' +
      `💰 المبلغ المودع: *${amount}* Coins\n` +
      `🏦 رصيد البنك الجديد: *${member.bankBalance}* Coins\n` +
      `💵 الرصيد المتاح: *${member.coins}* Coins`,
    { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في الإيداع:', error);
    await ctx.reply('❌ حدث خطأ في الإيداع.');
  }
}

/**
 * سحب من البنك
 */
async function withdraw(ctx, amount) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  if (!amount || amount <= 0) {
    await ctx.reply('❌ يرجى إدخال مبلغ صحيح!\nمثال: /withdraw 100');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  try {
    const member = await getOrCreateMember(groupId, userId);

    if (member.bankBalance < amount) {
      await ctx.reply(`❌ رصيدك في البنك غير كافٍ!\n🏦 رصيدك في البنك: ${member.bankBalance} Coins`);
      return;
    }

    // إجراء السحب
    member.bankBalance -= amount;
    member.coins += amount;
    await member.save();

    await ctx.reply('✅ *تم السحب بنجاح!*\n\n' +
      `💰 المبلغ المسحوب: *${amount}* Coins\n` +
      `🏦 رصيد البنك الجديد: *${member.bankBalance}* Coins\n` +
      `💵 الرصيد المتاح: *${member.coins}* Coins`,
    { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في السحب:', error);
    await ctx.reply('❌ حدث خطأ في السحب.');
  }
}

// ============================================
// أوامر التحويل
// ============================================

/**
 * تحويل عملات لأعضاء آخرين
 */
async function pay(ctx, targetUsername, amount) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  if (!targetUsername || !amount || amount <= 0) {
    await ctx.reply('❌ يرجى إدخال البيانات بشكل صحيح!\nمثال: /pay @username 100');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const senderId = ctx.from.id;

  // التحقق من المبلغ الأدنى
  if (amount < CONFIG.MIN_TRANSFER) {
    await ctx.reply(`❌ الحد الأدنى للتحويل هو ${CONFIG.MIN_TRANSFER} Coin`);
    return;
  }

  try {
    const sender = await getOrCreateMember(groupId, senderId);

    // التحقق من الرصيد
    if (sender.coins < amount) {
      await ctx.reply(`❌ رصيدك غير كافٍ!\n💰 رصيدك المتاح: ${sender.coins} Coins`);
      return;
    }

    // استخراج معرف المستخدم من الـ username
    let targetUserId = null;

    // إذا بدأ بـ @ يتم البحث عن العضو في المجموعة
    if (targetUsername.startsWith('@')) {
      const username = targetUsername.substring(1).toLowerCase();

      // البحث في الأعضاء
      const targetMember = await GroupMember.findOne({
        groupId,
        $or: [
          { userId: senderId } // هذا للتوضيح فقط، سنبحث بطريقة أخرى
        ]
      });

      // نحتاج للحصول على userId من خلال رسالة أو mention
      await ctx.reply('⚠️ يرجى استخدام الأمر بالرد على رسالة الشخص:\n/pay [المبلغ]');
      return;
    }

    // الحصول على targetUserId من الرد
    if (ctx.message.reply_to_message) {
      targetUserId = ctx.message.reply_to_message.from.id;
    } else if (!isNaN(parseInt(targetUsername))) {
      targetUserId = parseInt(targetUsername);
    }

    if (!targetUserId) {
      await ctx.reply('❌ يرجى الرد على رسالة الشخص أو إدخال معرفه!\nمثال: /pay 100 (بالرد على رسالة)');
      return;
    }

    // لا يمكن التحويل لنفسك
    if (targetUserId === senderId) {
      await ctx.reply('❌ لا يمكنك التحويل لنفسك!');
      return;
    }

    // الحصول على العضو المستهدف
    const targetMember = await getOrCreateMember(groupId, targetUserId);

    // حساب رسوم التحويل
    const transferFee = Math.floor(amount * (CONFIG.TRANSFER_FEE / 100));
    const finalAmount = amount - transferFee;

    // إجراء التحويل
    sender.coins -= amount;
    await sender.save();

    targetMember.coins += finalAmount;
    await targetMember.save();

    // إرسال رسالة التأكيد
    let message = '✅ *تم التحويل بنجاح!*\n\n';
    message += `📤 المرسل: ${ctx.from.first_name}\n`;
    message += `📥 المستلم: ${targetMember.userId}\n`;
    message += `💰 المبلغ: *${amount}* Coins\n`;

    if (transferFee > 0) {
      message += `💸 الرسوم: ${transferFee} Coins\n`;
      message += `✅ المبلغ المستلم: *${finalAmount}* Coins\n`;
    }

    message += `\n💵 رصيدك الجديد: *${sender.coins}* Coins`;

    await ctx.reply(message, { parse_mode: 'Markdown' });

    // إشعار المستلم (إذا كان موجوداً في المجموعة)
    try {
      await ctx.telegram.sendMessage(targetUserId,
        `💰收到了来自 ${ctx.from.first_name} 的转账！\n` +
        `المبلغ: ${finalAmount} Coins\n` +
        `المجموعة: ${ctx.chat.title}`
      );
    } catch (e) {
      // تجاهل إذا لم يتم إرساله
    }
  } catch (error) {
    console.error('خطأ في التحويل:', error);
    await ctx.reply('❌ حدث خطأ في التحويل.');
  }
}

// ============================================
// أوامر المتجر
// ============================================

/**
 * عرض متجر المجموعة
 */
async function showShop(ctx) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();

  try {
    const items = await GroupShop.find({ groupId, available: true }).lean();

    if (items.length === 0) {
      await ctx.reply('🏪 *متجر المجموعة*\n\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '📦 لا توجد عناصر في المتجر حالياً.\n' +
        '━━━━━━━━━━━━━━━━━━\n' +
        '💡 المشرفون يمكنهم إضافة عناصر باستخدام:\n' +
        '/additem [السعر] [الاسم]\n\n' +
        '💡 مثال:\n/additem 500 لقب مميز',
      { parse_mode: 'Markdown' });
      return;
    }

    let message = '🏪 *متجر المجموعة*\n';
    message += '━━━━━━━━━━━━━━━━━━\n\n';

    // تقسيم العناصر حسب النوع
    const titles = items.filter(i => i.type === 'title');
    const permissions = items.filter(i => i.type === 'permission');
    const others = items.filter(i => !['title', 'permission'].includes(i.type));

    if (titles.length > 0) {
      message += '🏷️ *الألقاب:*\n';
      titles.forEach(item => {
        message += `${item.icon} ${item.name}\n`;
        message += `   السعر: ${item.price} Coins\n`;
        message += `   /buy ${item.itemId}\n\n`;
      });
    }

    if (permissions.length > 0) {
      message += '⚡ *الصلاحيات:*\n';
      permissions.forEach(item => {
        message += `${item.icon} ${item.name}\n`;
        message += `   السعر: ${item.price} Coins\n`;
        if (item.duration) {
          message += `   المدة: ${item.duration} ساعة\n`;
        }
        message += `   /buy ${item.itemId}\n\n`;
      });
    }

    if (others.length > 0) {
      message += '📦 *أخرى:*\n';
      others.forEach(item => {
        message += `${item.icon} ${item.name}\n`;
        message += `   السعر: ${item.price} Coins\n`;
        if (item.description) {
          message += `   ${item.description}\n`;
        }
        message += `   /buy ${item.itemId}\n\n`;
      });
    }

    message += '━━━━━━━━━━━━━━━━━━\n';
    message += '💡 للمشرفين:\n';
    message += '/additem - إضافة عنصر\n';
    message += '/removeitem - حذف عنصر';

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في عرض المتجر:', error);
    await ctx.reply('❌ حدث خطأ في عرض المتجر.');
  }
}

/**
 * إضافة عنصر للمتجر (للمشرفين)
 */
async function addShopItem(ctx, args) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  // التحقق من صلاحية المشرف
  const admin = await isAdmin(ctx, groupId, userId);
  if (!admin) {
    await ctx.reply('❌ هذا الأمر للمشرفين فقط!');
    return;
  }

  // تحليل الأدخل
  // /additem price name [type] [duration]
  if (!args || args.length < 2) {
    await ctx.reply('❌ يرجى إدخال البيانات بشكل صحيح!\n\n' +
      '💡 الطريقة:\n' +
      '/additem [السعر] [الاسم] [النوع] [المدة]\n\n' +
      '💡 الأنواع المتاحة:\n' +
      '- title (لقب)\n' +
      '- permission (صلاحية)\n' +
      '- badge (شارة)\n\n' +
      '💡 مثال:\n' +
      '/additem 500 لقب مميز title\n' +
      '/additem 100 رسائل مؤقتة permission 24');
    return;
  }

  const price = parseInt(args[0]);
  const name = args[1];
  const type = args[2] || 'custom';
  const duration = args[3] ? parseInt(args[3]) : null;

  if (!price || price <= 0) {
    await ctx.reply('❌ يرجى إدخال سعر صحيح!');
    return;
  }

  try {
    // التحقق من عدم وجود عنصر بنفس الاسم
    const existingItem = await GroupShop.findOne({ groupId, name });
    if (existingItem) {
      await ctx.reply('❌ يوجد عنصر بنفس الاسم في المتجر!');
      return;
    }

    // إنشاء معرف فريد
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // تحديد الأيقونة حسب النوع
    const icons = {
      title: '🏷️',
      permission: '⚡',
      badge: '🎖️',
      sticker: '🎨',
      custom: '📦'
    };

    // تحديد نوع الصلاحية
    let permissionType = null;
    if (type === 'permission') {
      permissionType = 'can_send_messages'; // افتراضي
    }

    const newItem = new GroupShop({
      groupId,
      itemId,
      name,
      description: 'عنصر في متجر المجموعة',
      type,
      price,
      duration: duration || (type === 'permission' ? CONFIG.PERMISSION_DURATIONS.can_send_messages : null),
      permissionType,
      icon: icons[type] || '📦',
      addedBy: userId
    });

    await newItem.save();

    await ctx.reply('✅ *تم إضافة العنصر بنجاح!*\n\n' +
      `📦 الاسم: ${newItem.icon} ${name}\n` +
      `💰 السعر: ${price} Coins\n` +
      `🏷️ النوع: ${type}\n` +
      `🔑 معرف العنصر: ${itemId}\n\n` +
      `💡 للأعضاء:\n/buy ${itemId}`,
    { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في إضافة العنصر:', error);
    await ctx.reply('❌ حدث خطأ في إضافة العنصر.');
  }
}

/**
 * حذف عنصر من المتجر
 */
async function removeShopItem(ctx, itemId) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  // التحقق من صلاحية المشرف
  const admin = await isAdmin(ctx, groupId, userId);
  if (!admin) {
    await ctx.reply('❌ هذا الأمر للمشرفين فقط!');
    return;
  }

  if (!itemId) {
    await ctx.reply('❌ يرجى إدخال معرف العنصر!\nمثال: /removeitem item_xxx');
    return;
  }

  try {
    const item = await GroupShop.findOne({ groupId, itemId });

    if (!item) {
      await ctx.reply('❌ العنصر غير موجود!');
      return;
    }

    await GroupShop.deleteOne({ groupId, itemId });

    await ctx.reply('✅ *تم حذف العنصر بنجاح!*\n\n' +
      `📦 الاسم: ${item.icon} ${item.name}\n` +
      `💰 السعر: ${item.price} Coins`,
    { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في حذف العنصر:', error);
    await ctx.reply('❌ حدث خطأ في حذف العنصر.');
  }
}

/**
 * شراء عنصر من المتجر
 */
async function buyItem(ctx, itemId) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  if (!itemId) {
    await ctx.reply('❌ يرجى إدخال معرف العنصر!\nمثال: /buy item_xxx');
    return;
  }

  try {
    const item = await GroupShop.findOne({ groupId, itemId, available: true });

    if (!item) {
      await ctx.reply('❌ العنصر غير موجود أو غير متاح!');
      return;
    }

    const member = await getOrCreateMember(groupId, userId);

    // التحقق من الرصيد
    if (member.coins < item.price) {
      await ctx.reply('❌ رصيدك غير كافٍ!\n\n' +
        `💰 السعر: ${item.price} Coins\n` +
        `💵 رصيدك: ${member.coins} Coins\n\n` +
        '💡 اكسب المزيد من العملات بالتفاعل!',
      { parse_mode: 'Markdown' });
      return;
    }

    // التحقق من قيود الشراء
    if (item.maxPurchases && item.purchaseCount >= item.maxPurchases) {
      await ctx.reply('❌ تم نفاد هذا العنصر!');
      return;
    }

    // تنفيذ عملية الشراء
    member.coins -= item.price;
    await member.save();

    // تحديث عدد مرات الشراء
    item.purchaseCount += 1;
    await item.save();

    // تطبيق تأثير العنصر
    let resultMessage = '';

    if (item.type === 'title') {
      // شراء لقب مخصص
      member.customTitle = item.name;
      member.title = item.name;
      await member.save();

      resultMessage = '🎉 *تم شراء اللقب بنجاح!*\n\n' +
        `🏷️ اللقب الجديد: *${item.name}*\n\n` +
        `💰 تم خصم: ${item.price} Coins\n` +
        `💵 رصيدك المتبقي: ${member.coins} Coins\n\n` +
        '✨ تم تحديث ملفك الشخصي تلقائياً!';
    }
    else if (item.type === 'permission') {
      // شراء صلاحية مؤقتة
      // هنا يمكن إضافة منطق لتفعيل الصلاحية
      resultMessage = '🎉 *تم شراء الصلاحية بنجاح!*\n\n' +
        `⚡ ${item.name}\n` +
        `⏰ المدة: ${item.duration || 24} ساعة\n\n` +
        `💰 تم خصم: ${item.price} Coins\n` +
        `💵 رصيدك المتبقي: ${member.coins} Coins\n\n` +
        '💡 تم تفعيل الصلاحية!';
    }
    else {
      // عناصر أخرى
      resultMessage = '🎉 *تم الشراء بنجاح!*\n\n' +
        `📦 العنصر: ${item.icon} ${item.name}\n\n` +
        `💰 تم خصم: ${item.price} Coins\n` +
        `💵 رصيدك المتبقي: ${member.coins} Coins`;
    }

    await ctx.reply(resultMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في الشراء:', error);
    await ctx.reply('❌ حدث خطأ في عملية الشراء.');
  }
}

// ============================================
// أوامر شراء اللقب
// ============================================

/**
 * شراء لقب مخصص
 */
async function buyTitle(ctx, title, price) {
  if (!isGroupChat(ctx)) {
    await ctx.reply('❌ هذا الأمر متاح فقط في المجموعات!');
    return;
  }

  if (!title) {
    await ctx.reply('❌ يرجى إدخال اللقب!\nمثال: /buytitle لقبك 500');
    return;
  }

  const groupId = ctx.chat.id.toString();
  const userId = ctx.from.id;

  // استخدام السعر الافتراضي إذا لم يتم تحديده
  const titlePrice = price || CONFIG.DEFAULT_TITLE_PRICE;

  if (titlePrice <= 0) {
    await ctx.reply('❌ يرجى إدخال سعر صحيح!');
    return;
  }

  try {
    const member = await getOrCreateMember(groupId, userId);

    // التحقق من الرصيد
    if (member.coins < titlePrice) {
      await ctx.reply('❌ رصيدك غير كافٍ!\n\n' +
        `💰 السعر: ${titlePrice} Coins\n` +
        `💵 رصيدك: ${member.coins} Coins`,
      { parse_mode: 'Markdown' });
      return;
    }

    // التحقق من طول اللقب
    if (title.length > 30) {
      await ctx.reply('❌ اللقب طويل جداً! (الحد الأقصى 30 حرف)');
      return;
    }

    // تطبيق اللقب
    member.coins -= titlePrice;
    member.customTitle = title;
    member.title = title;
    await member.save();

    await ctx.reply('🎉 *تم شراء اللقب بنجاح!*\n\n' +
      `🏷️ اللقب الجديد: *${title}*\n\n` +
      `💰 السعر: ${titlePrice} Coins\n` +
      `💵 رصيدك المتبقي: ${member.coins} Coins\n\n` +
      '✨ تم تحديث ملفك الشخصي!',
    { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('خطأ في شراء اللقب:', error);
    await ctx.reply('❌ حدث خطأ في شراء اللقب.');
  }
}

// ============================================
// معالجة الأوامر
// ============================================

/**
 * معالجة أوامر اقتصاد المجموعة
 */
async function handleGroupEconomyCommand(ctx) {
  const command = ctx.message.text.split(' ')[0].toLowerCase();
  const args = ctx.message.text.split(' ').slice(1);

  switch (command) {
    case '/balance':
    case '/رصيد':
      await showBalance(ctx);
      break;

    case '/bank':
    case '/بنك': {
      await showBank(ctx);
      break;
    }

    case '/deposit':
    case '/إيداع': {
      const depositAmount = parseInt(args[0]);
      await deposit(ctx, depositAmount);
      break;
    }

    case '/withdraw':
    case '/سحب': {
      const withdrawAmount = parseInt(args[0]);
      await withdraw(ctx, withdrawAmount);
      break;
    }

    case '/pay':
    case '/تحويل': {
      const payAmount = parseInt(args[args.length - 1]);
      const targetUser = args.slice(0, -1).join(' ');
      await pay(ctx, targetUser, payAmount);
      break;
    }

    case '/shop':
    case '/متجر': {
      await showShop(ctx);
      break;
    }

    case '/buy':
    case '/شراء': {
      const itemId = args[0];
      await buyItem(ctx, itemId);
      break;
    }

    case '/additem':
    case '/إضافة_عنصر': {
      await addShopItem(ctx, args);
      break;
    }

    case '/removeitem':
    case '/حذف_عنصر': {
      const removeId = args[0];
      await removeShopItem(ctx, removeId);
      break;
    }

    case '/buytitle':
    case '/شراء_لقب': {
      const titlePriceArg = args[args.length - 1];
      const isNumber = !isNaN(parseInt(titlePriceArg));
      const titlePrice2 = isNumber ? parseInt(titlePriceArg) : null;
      const titleText = isNumber ? args.slice(0, -1).join(' ') : args.join(' ');
      await buyTitle(ctx, titleText, titlePrice2);
      break;
    }

    default:
      // تجاهل الأوامر غير المعروفة
      break;
  }
}

/**
 * معالجة الفائدة البنكية
 * يمكن استدعاؤها يومياً
 */
async function processBankInterest() {
  try {
    // الحصول على جميع الأعضاء الذين لديهم رصيد في البنك
    const members = await GroupMember.find({
      bankBalance: { $gte: CONFIG.MIN_DEPOSIT_FOR_INTEREST }
    });

    let processedCount = 0;

    for (const member of members) {
      // التحقق من最后一次 الفائدة
      const lastInterest = member.lastBankInterest ? new Date(member.lastBankInterest) : null;
      const now = new Date();

      // إذا مر يوم على最后一次 الفائدة
      if (!lastInterest || (now - lastInterest) >= 24 * 60 * 60 * 1000) {
        // حساب الفائدة
        const interest = Math.floor(member.bankBalance * (CONFIG.DAILY_BANK_INTEREST / 100));

        if (interest > 0) {
          member.bankBalance += interest;
          member.lastBankInterest = now;
          await member.save();
          processedCount++;
        }
      }
    }

    console.log(`✅ تم معالجة الفائدة البنكية لـ ${processedCount} عضو`);
    return processedCount;
  } catch (error) {
    console.error('خطأ في معالجة الفائدة البنكية:', error);
    return 0;
  }
}

// ============================================
// تصدير الدوال
// ============================================

module.exports = {
  // أوامر العرض
  showBalance,
  showBank,
  showShop,

  // أوامر البنك
  deposit,
  withdraw,

  // أوامر التحويل
  pay,

  // أوامر المتجر
  addShopItem,
  removeShopItem,
  buyItem,

  // أوامر الألقاب
  buyTitle,

  // معالجة الأوامر
  handleGroupEconomyCommand,

  // معالجة الفائدة
  processBankInterest,

  // إعدادات
  CONFIG
};
