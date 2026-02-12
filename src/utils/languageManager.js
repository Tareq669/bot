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
      welcome_user: '👋 مرحباً {name}!\n\n🎯 اختر من لوحة المفاتيح:',
      owner_welcome: '👑 أهلاً بك يا مالك البوت {name}!\n\n⚡ لديك صلاحيات كاملة على النظام\n🎯 اختر من لوحة المفاتيح الخاصة:',
      friend: 'صديقي',
      help_title: '📚 الأوامر المتاحة:',
      help_start: '/start - البدء',
      help_profile: '/profile - ملفك',
      help_balance: '/balance - رصيدك',
      help_daily: '/daily - مكافأة يومية',
      help_leaderboard: '/leaderboard - الترتيب',
      language_settings_title: '🌐 إعدادات اللغة',
      languages_menu_title: '🌍 إدارة اللغات',
      current_language: 'اللغة الحالية: {language}',
      language_choose: 'اختر اللغة المفضلة للبوت من القائمة أدناه.',
      languages_available: 'اللغات المتاحة:',
      languages_note: '💡 سيتم تطبيق اللغة على الرسائل والقوائم الأساسية.',
      khatma: '🕌 الختمة',
      quotes: '💭 الاقتباسات',
      poetry: '✍️ الشعر',
      features: '✨ الميزات',
      library: '📚 المكتبة',
      transfers: '💸 التحويلات والتبرعات',
      smart_notifications: '🔔 الإشعارات الذكية',
      language_admin: '🌍 إدارة اللغات',
      backups: '📁 النسخ الاحتياطية',
      cache: '⚡ التخزين المؤقت',
      protection: '🛡️ حماية من الإساءة',
      stats: '📊 إحصائيات',
      rewards: '🎁 المكافآت',
      close: '❌ إغلق',
      owner_panel: '👑 لوحة المالك',
      user_not_found: '❌ لم يتم العثور على ملفك',
      profile_unknown: 'غير معروف',
      profile_no_username: 'بدون username',
      balance_title: '💰 رصيدك المالي',
      balance_current_label: '💵 الرصيد الحالي:',
      balance_daily_income_label: '📈 الدخل اليومي:',
      balance_spending_label: '💸 الإنفاق:',
      balance_transactions_label: '📊 إجمالي المعاملات:',
      transfer_button: '💸 تحويل',
      economy_shop_title: '🏪 المتجر',
      economy_shop_item_line: '{index}. {name} - {price} عملة',
      economy_inventory_title: '📦 حقيبتك',
      economy_inventory_empty: '❌ حقيبتك فارغة',
      economy_inventory_item_line: '{index}. {name} x{quantity}',
      economy_stats_title: '📊 إحصائيات الاقتصاد',
      economy_stats_current_balance: '💰 الرصيد الحالي:',
      economy_stats_general: '📈 الإحصائيات العامة:',
      economy_stats_total_earnings: '• الإجمالي المكتسب:',
      economy_stats_total_spending: '• الإجمالي المُنفق:',
      economy_stats_net_profit: '• الربح الصافي:',
      economy_stats_daily_avg: '• المتوسط اليومي:',
      economy_stats_activity: '🏪 نشاطك:',
      economy_stats_purchases: '• عمليات الشراء:',
      economy_stats_transfers: '• التحويلات:',
      economy_stats_games: '• الألعاب اللعوب:',
      economy_stats_ranking: '💎 الترتيب:',
      economy_stats_wealth: '• الثروة:',
      economy_stats_wealth_pending: 'قيد التحديث',
      economy_stats_achievements: '• الإنجازات:',
      transfer_stats_title: '💸 إحصائيات التحويلات',
      transfer_sent: '📤 التحويلات التي أرسلتها:',
      transfer_sent_count: '• العدد:',
      transfer_sent_amount: '• المبلغ الإجمالي:',
      transfer_received: '📥 التحويلات التي استقبلتها:',
      transfer_received_count: '• العدد:',
      transfer_received_amount: '• المبلغ الإجمالي:',
      transfer_balance: '💰 الرصيد الحالي:',
      profile_info_title: '📊 معلومات ملفك',
      profile_id_label: '🆔 المعرف:',
      profile_name_label: '📝 الاسم:',
      profile_username_label: '🧾 المعرف:',
      profile_level_label: '🎖️ المستوى:',
      profile_xp_label: '⭐ النقاط:',
      profile_coins_label: '💰 العملات:',
      profile_joined_label: '📅 تاريخ الانضمام:',
      profile_badges_title: '🏅 شاراتك:',
      profile_no_badges: '❌ لم تحصل على أي شارات بعد',
      profile_no_badges_hint: 'ابدأ باللعب لتحصل على شارات!',
      profile_games_title: '📊 إحصائيات الألعاب:',
      profile_games_played: '🎮 الألعاب الممارسة:',
      profile_games_wins: '🏆 الانتصارات:',
      profile_games_win_rate: '📈 نسبة الفوز:',
      profile_gifts_title: '🎁 الهدايا:',
      profile_gifts_none: 'لا توجد هدايا متاحة حالياً.',
      game_rps_title: '🪨 حجر ورق مقص',
      game_rps_choose: 'اختر اختيارك:',
      game_rps_rock: '🪨 حجر',
      game_rps_paper: '📄 ورق',
      game_rps_scissors: '✂️ مقص',
      game_play_again: '🔄 لعب مرة أخرى',
      game_guess_title: '🔢 لعبة التخمين',
      game_guess_prompt_1: 'أنا فكرت في رقم من 1 إلى 100',
      game_guess_prompt_2: 'حاول أن تخمنه!',
      game_quiz_title: '🧠 سؤال ثقافي',
      game_quiz_correct: '✅ الإجابة الصحيحة:',
      game_quiz_answer: '📝 إجابتك:',
      game_quiz_another: '🔄 سؤال آخر',
      game_dice_roll_again: '🔄 رول آخر',
      game_luck_title: '🍀 لعبة الحظ',
      game_luck_win: '🍀 <b>حظ سعيد!</b> 🎉\n\n✨ لقد فزت بـ <b>{reward}</b> عملة!\n💰 رصيدك الآن: {coins}',
      game_luck_lose: '🍀 <b>لعبة الحظ</b>\n\n😔 لم يحالفك الحظ هذه المرة\nحاول مرة أخرى!',
      game_challenge_title: '🎯 <b>تحديك اليومي</b>',
      game_challenge_hint: '💡 أكمل التحدي للحصول على المكافأة!',
      game_challenge_another: '🔄 تحدي آخر',
      game_challenge_complete: '✅ أكملت',
      game_result_win: 'انتصار!',
      game_result_draw: 'تعادل!',
      game_result_lost: 'هزيمة!',
      game_result_player: '🎮 اللاعب:',
      game_result_outcome: '🏆 النتيجة:',
      game_result_prize: '💰 الجائزة:',
      rps_you_label: '🙂 أنت:',
      rps_bot_label: '🤖 أنا:',
      you_name: 'أنت',
      rps_win_line: '✅ انتصرت! +{prize} عملة',
      rps_loss_line: '❌ خسرت',
      rps_draw_line: '🤝 تعادل',
      guess_hint_lower: '📉 الرقم أقل من اختيارك',
      guess_hint_higher: '📈 الرقم أكثر من اختيارك',
      guess_result_title: '🎮 لعبة التخمين',
      guess_number_label: '🎯 الرقم:',
      guess_choice_label: '🔢 اختيارك:',
      luck_title: '🎮 لعبة الحظ',
      dice_title: '🎲 رول النرد',
      dice_result_label: '🎲 النتيجة:',
      daily_reward_once: '⏰ يمكنك الادعاء مرة واحدة يومياً فقط',
      daily_reward_try_after: '⏳ حاول بعد {hours} ساعة',
      daily_reward_title: '🎁 <b>مكافأة يومية</b>',
      daily_reward_received: '💰 حصلت على <b>{reward}</b> عملة!',
      daily_reward_bonus: '🎁 مكافأة إضافية: <b>{bonus}</b> عملة',
      daily_reward_xp: '⭐ حصلت على <b>{xp}</b> نقطة XP',
      daily_reward_streak: '⛓️ <b>سلسلتك المتتالية:</b> <b>{streak}</b> يوم',
      daily_reward_balance: '💵 <b>رصيدك الجديد:</b> <b>{coins}</b> عملة',
      daily_reward_reminder: '✨ تذكر: ادعِ المكافأة كل يوم للحفاظ على سلسلتك!',
      shop_item_not_found: '❌ العنصر غير موجود',
      shop_user_not_found: '❌ المستخدم غير موجود',
      shop_insufficient_balance: '❌ رصيدك غير كافي. تحتاج {diff} عملة أخرى',
      shop_purchase_success: '✅ تم الشراء بنجاح!',
      shop_purchase_summary: '✅ تم الشراء بنجاح!\n\n🎉 {item}\n💰 تم خصم {price} عملة\n\nرصيدك الآن: {coins} عملة',
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
      welcome_user: '👋 Hello {name}!\n\n🎯 Choose from the keyboard:',
      owner_welcome: '👑 Welcome, owner {name}!\n\n⚡ You have full system access\n🎯 Choose from the owner keyboard:',
      friend: 'my friend',
      help_title: '📚 Available commands:',
      help_start: '/start - Start',
      help_profile: '/profile - My profile',
      help_balance: '/balance - My balance',
      help_daily: '/daily - Daily reward',
      help_leaderboard: '/leaderboard - Leaderboard',
      language_settings_title: '🌐 Language Settings',
      languages_menu_title: '🌍 Language Manager',
      current_language: 'Current language: {language}',
      language_choose: 'Choose your preferred bot language from the list below.',
      languages_available: 'Available languages:',
      languages_note: '💡 The language will be applied to core messages and menus.',
      khatma: '🕌 Khatma',
      quotes: '💭 Quotes',
      poetry: '✍️ Poetry',
      features: '✨ Features',
      library: '📚 Library',
      transfers: '💸 Transfers & Donations',
      smart_notifications: '🔔 Smart Notifications',
      language_admin: '🌍 Language Manager',
      backups: '📁 Backups',
      cache: '⚡ Cache',
      protection: '🛡️ Abuse Protection',
      stats: '📊 Stats',
      rewards: '🎁 Rewards',
      close: '❌ Close',
      owner_panel: '👑 Owner Panel',
      user_not_found: '❌ Profile not found',
      profile_unknown: 'Unknown',
      profile_no_username: 'No username',
      balance_title: '💰 Your Balance',
      balance_current_label: '💵 Current balance:',
      balance_daily_income_label: '📈 Daily income:',
      balance_spending_label: '💸 Spending:',
      balance_transactions_label: '📊 Total transactions:',
      transfer_button: '💸 Transfer',
      economy_shop_title: '🏪 Shop',
      economy_shop_item_line: '{index}. {name} - {price} coins',
      economy_inventory_title: '📦 Your Bag',
      economy_inventory_empty: '❌ Your bag is empty',
      economy_inventory_item_line: '{index}. {name} x{quantity}',
      economy_stats_title: '📊 Economy Stats',
      economy_stats_current_balance: '💰 Current balance:',
      economy_stats_general: '📈 General stats:',
      economy_stats_total_earnings: '• Total earned:',
      economy_stats_total_spending: '• Total spent:',
      economy_stats_net_profit: '• Net profit:',
      economy_stats_daily_avg: '• Daily average:',
      economy_stats_activity: '🏪 Your activity:',
      economy_stats_purchases: '• Purchases:',
      economy_stats_transfers: '• Transfers:',
      economy_stats_games: '• Games played:',
      economy_stats_ranking: '💎 Ranking:',
      economy_stats_wealth: '• Wealth:',
      economy_stats_wealth_pending: 'Updating',
      economy_stats_achievements: '• Achievements:',
      transfer_stats_title: '💸 Transfer Stats',
      transfer_sent: '📤 Sent transfers:',
      transfer_sent_count: '• Count:',
      transfer_sent_amount: '• Total amount:',
      transfer_received: '📥 Received transfers:',
      transfer_received_count: '• Count:',
      transfer_received_amount: '• Total amount:',
      transfer_balance: '💰 Current balance:',
      profile_info_title: '📊 Profile Info',
      profile_id_label: '🆔 ID:',
      profile_name_label: '📝 Name:',
      profile_username_label: '🧾 Username:',
      profile_level_label: '🎖️ Level:',
      profile_xp_label: '⭐ XP:',
      profile_coins_label: '💰 Coins:',
      profile_joined_label: '📅 Joined:',
      profile_badges_title: '🏅 Your Badges:',
      profile_no_badges: '❌ You have no badges yet',
      profile_no_badges_hint: 'Start playing to earn badges!',
      profile_games_title: '📊 Game Stats:',
      profile_games_played: '🎮 Games played:',
      profile_games_wins: '🏆 Wins:',
      profile_games_win_rate: '📈 Win rate:',
      profile_gifts_title: '🎁 Gifts:',
      profile_gifts_none: 'No gifts available right now.',
      game_rps_title: '🪨 Rock Paper Scissors',
      game_rps_choose: 'Choose your move:',
      game_rps_rock: '🪨 Rock',
      game_rps_paper: '📄 Paper',
      game_rps_scissors: '✂️ Scissors',
      game_play_again: '🔄 Play again',
      game_guess_title: '🔢 Guess Game',
      game_guess_prompt_1: 'I picked a number from 1 to 100',
      game_guess_prompt_2: 'Try to guess it!',
      game_quiz_title: '🧠 Quiz Question',
      game_quiz_correct: '✅ Correct answer:',
      game_quiz_answer: '📝 Your answer:',
      game_quiz_another: '🔄 Another question',
      game_dice_roll_again: '🔄 Roll again',
      game_luck_title: '🍀 Luck Game',
      game_luck_win: '🍀 <b>Good luck!</b> 🎉\n\n✨ You won <b>{reward}</b> coins!\n💰 Your balance now: {coins}',
      game_luck_lose: '🍀 <b>Luck Game</b>\n\n😔 Not this time\nTry again!',
      game_challenge_title: '🎯 <b>Your Daily Challenge</b>',
      game_challenge_hint: '💡 Complete the challenge to get the reward!',
      game_challenge_another: '🔄 Another challenge',
      game_challenge_complete: '✅ Completed',
      game_result_win: 'Victory!',
      game_result_draw: 'Draw!',
      game_result_lost: 'Defeat!',
      game_result_player: '🎮 Player:',
      game_result_outcome: '🏆 Result:',
      game_result_prize: '💰 Prize:',
      rps_you_label: '🙂 You:',
      rps_bot_label: '🤖 Me:',
      you_name: 'You',
      rps_win_line: '✅ You won! +{prize} coins',
      rps_loss_line: '❌ You lost',
      rps_draw_line: '🤝 Draw',
      guess_hint_lower: '📉 The number is lower',
      guess_hint_higher: '📈 The number is higher',
      guess_result_title: '🎮 Guess Game',
      guess_number_label: '🎯 Number:',
      guess_choice_label: '🔢 Your guess:',
      luck_title: '🎮 Luck Game',
      dice_title: '🎲 Dice Roll',
      dice_result_label: '🎲 Result:',
      daily_reward_once: '⏰ You can claim once per day only',
      daily_reward_try_after: '⏳ Try again after {hours} hours',
      daily_reward_title: '🎁 <b>Daily Reward</b>',
      daily_reward_received: '💰 You received <b>{reward}</b> coins!',
      daily_reward_bonus: '🎁 Bonus reward: <b>{bonus}</b> coins',
      daily_reward_xp: '⭐ You received <b>{xp}</b> XP',
      daily_reward_streak: '⛓️ <b>Your streak:</b> <b>{streak}</b> days',
      daily_reward_balance: '💵 <b>Your new balance:</b> <b>{coins}</b> coins',
      daily_reward_reminder: '✨ Remember: claim daily to keep your streak!',
      shop_item_not_found: '❌ Item not found',
      shop_user_not_found: '❌ User not found',
      shop_insufficient_balance: '❌ Insufficient balance. You need {diff} more coins',
      shop_purchase_success: '✅ Purchase successful!',
      shop_purchase_summary: '✅ Purchase successful!\n\n🎉 {item}\n💰 {price} coins deducted\n\nYour balance now: {coins} coins',
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
      welcome_user: '👋 Bonjour {name}!\n\n🎯 Choisissez depuis le clavier:',
      owner_welcome: '👑 Bienvenue, proprietaire {name}!\n\n⚡ Vous avez un acces complet au systeme\n🎯 Choisissez depuis le clavier proprietaire:',
      friend: 'mon ami',
      help_title: '📚 Commandes disponibles:',
      help_start: '/start - Demarrer',
      help_profile: '/profile - Mon profil',
      help_balance: '/balance - Mon solde',
      help_daily: '/daily - Recompense quotidienne',
      help_leaderboard: '/leaderboard - Classement',
      language_settings_title: '🌐 Parametres de langue',
      languages_menu_title: '🌍 Gestion des langues',
      current_language: 'Langue actuelle: {language}',
      language_choose: 'Choisissez la langue preferee du bot dans la liste ci-dessous.',
      languages_available: 'Langues disponibles:',
      languages_note: '💡 La langue sera appliquee aux messages et menus principaux.',
      khatma: '🕌 Khatma',
      quotes: '💭 Citations',
      poetry: '✍️ Poesie',
      features: '✨ Fonctionnalites',
      library: '📚 Bibliotheque',
      transfers: '💸 Transferts et Dons',
      smart_notifications: '🔔 Notifications Intelligentes',
      language_admin: '🌍 Gestion des langues',
      backups: '📁 Sauvegardes',
      cache: '⚡ Cache',
      protection: '🛡️ Protection contre les abus',
      stats: '📊 Statistiques',
      rewards: '🎁 Recompenses',
      close: '❌ Fermer',
      owner_panel: '👑 Panneau Proprietaire',
      user_not_found: '❌ Profil introuvable',
      profile_unknown: 'Inconnu',
      profile_no_username: 'Sans nom d\'utilisateur',
      balance_title: '💰 Votre Solde',
      balance_current_label: '💵 Solde actuel:',
      balance_daily_income_label: '📈 Revenu quotidien:',
      balance_spending_label: '💸 Depenses:',
      balance_transactions_label: '📊 Total des transactions:',
      transfer_button: '💸 Transfert',
      economy_shop_title: '🏪 Boutique',
      economy_shop_item_line: '{index}. {name} - {price} pieces',
      economy_inventory_title: '📦 Votre Sac',
      economy_inventory_empty: '❌ Votre sac est vide',
      economy_inventory_item_line: '{index}. {name} x{quantity}',
      economy_stats_title: '📊 Statistiques Economie',
      economy_stats_current_balance: '💰 Solde actuel:',
      economy_stats_general: '📈 Statistiques generales:',
      economy_stats_total_earnings: '• Total gagne:',
      economy_stats_total_spending: '• Total depense:',
      economy_stats_net_profit: '• Profit net:',
      economy_stats_daily_avg: '• Moyenne quotidienne:',
      economy_stats_activity: '🏪 Votre activite:',
      economy_stats_purchases: '• Achats:',
      economy_stats_transfers: '• Transferts:',
      economy_stats_games: '• Jeux joues:',
      economy_stats_ranking: '💎 Classement:',
      economy_stats_wealth: '• Richesse:',
      economy_stats_wealth_pending: 'Mise a jour',
      economy_stats_achievements: '• Realisations:',
      transfer_stats_title: '💸 Statistiques Transferts',
      transfer_sent: '📤 Transferts envoyes:',
      transfer_sent_count: '• Nombre:',
      transfer_sent_amount: '• Montant total:',
      transfer_received: '📥 Transferts recus:',
      transfer_received_count: '• Nombre:',
      transfer_received_amount: '• Montant total:',
      transfer_balance: '💰 Solde actuel:',
      profile_info_title: '📊 Infos Profil',
      profile_id_label: '🆔 ID:',
      profile_name_label: '📝 Nom:',
      profile_username_label: '🧾 Nom d\'utilisateur:',
      profile_level_label: '🎖️ Niveau:',
      profile_xp_label: '⭐ XP:',
      profile_coins_label: '💰 Pieces:',
      profile_joined_label: '📅 Inscrit le:',
      profile_badges_title: '🏅 Vos Badges:',
      profile_no_badges: '❌ Aucun badge pour le moment',
      profile_no_badges_hint: 'Jouez pour gagner des badges!',
      profile_games_title: '📊 Stats Jeux:',
      profile_games_played: '🎮 Jeux joues:',
      profile_games_wins: '🏆 Victoires:',
      profile_games_win_rate: '📈 Taux de victoire:',
      profile_gifts_title: '🎁 Cadeaux:',
      profile_gifts_none: 'Aucun cadeau disponible pour le moment.',
      game_rps_title: '🪨 Pierre Papier Ciseaux',
      game_rps_choose: 'Choisissez votre coup:',
      game_rps_rock: '🪨 Pierre',
      game_rps_paper: '📄 Papier',
      game_rps_scissors: '✂️ Ciseaux',
      game_play_again: '🔄 Rejouer',
      game_guess_title: '🔢 Jeu de Devinette',
      game_guess_prompt_1: 'J\'ai choisi un nombre de 1 a 100',
      game_guess_prompt_2: 'Essayez de le deviner!',
      game_quiz_title: '🧠 Question Quiz',
      game_quiz_correct: '✅ Bonne reponse:',
      game_quiz_answer: '📝 Votre reponse:',
      game_quiz_another: '🔄 Autre question',
      game_dice_roll_again: '🔄 Relancer',
      game_luck_title: '🍀 Jeu de Chance',
      game_luck_win: '🍀 <b>Bonne chance!</b> 🎉\n\n✨ Vous avez gagne <b>{reward}</b> pieces!\n💰 Solde actuel: {coins}',
      game_luck_lose: '🍀 <b>Jeu de Chance</b>\n\n😔 Pas cette fois\nReessayez!',
      game_challenge_title: '🎯 <b>Votre defit du jour</b>',
      game_challenge_hint: '💡 Terminez le defit pour obtenir la recompense!',
      game_challenge_another: '🔄 Autre defit',
      game_challenge_complete: '✅ Termine',
      game_result_win: 'Victoire!',
      game_result_draw: 'Match nul!',
      game_result_lost: 'Defaite!',
      game_result_player: '🎮 Joueur:',
      game_result_outcome: '🏆 Resultat:',
      game_result_prize: '💰 Prix:',
      rps_you_label: '🙂 Vous:',
      rps_bot_label: '🤖 Moi:',
      you_name: 'Vous',
      rps_win_line: '✅ Vous avez gagne! +{prize} pieces',
      rps_loss_line: '❌ Vous avez perdu',
      rps_draw_line: '🤝 Egalite',
      guess_hint_lower: '📉 Le nombre est plus bas',
      guess_hint_higher: '📈 Le nombre est plus haut',
      guess_result_title: '🎮 Jeu de Devinette',
      guess_number_label: '🎯 Nombre:',
      guess_choice_label: '🔢 Votre essai:',
      luck_title: '🎮 Jeu de Chance',
      dice_title: '🎲 Lancer de des',
      dice_result_label: '🎲 Resultat:',
      daily_reward_once: '⏰ Vous ne pouvez reclamer qu\'une fois par jour',
      daily_reward_try_after: '⏳ Reessayez apres {hours} heures',
      daily_reward_title: '🎁 <b>Recompense Quotidienne</b>',
      daily_reward_received: '💰 Vous avez recu <b>{reward}</b> pieces!',
      daily_reward_bonus: '🎁 Bonus: <b>{bonus}</b> pieces',
      daily_reward_xp: '⭐ Vous avez recu <b>{xp}</b> XP',
      daily_reward_streak: '⛓️ <b>Votre serie:</b> <b>{streak}</b> jours',
      daily_reward_balance: '💵 <b>Nouveau solde:</b> <b>{coins}</b> pieces',
      daily_reward_reminder: '✨ N\'oubliez pas: reclamez chaque jour pour garder votre serie!',
      shop_item_not_found: '❌ Article introuvable',
      shop_user_not_found: '❌ Utilisateur introuvable',
      shop_insufficient_balance: '❌ Solde insuffisant. Il vous faut {diff} pieces',
      shop_purchase_success: '✅ Achat reussi!',
      shop_purchase_summary: '✅ Achat reussi!\n\n🎉 {item}\n💰 {price} pieces deduites\n\nVotre solde: {coins} pieces',
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

  getTranslationsForLanguage(languageCode) {
    return this.languages[languageCode]?.translations || this.languages.ar.translations;
  }

  async getTranslationsForUser(userId) {
    const language = await this.getUserLanguage(userId);
    return {
      language,
      translations: this.getTranslationsForLanguage(language)
    };
  }

  formatTemplate(template, vars = {}) {
    if (!template) return '';
    return template.replace(/\{(\w+)\}/g, (_, key) => {
      const value = vars[key];
      return value === undefined || value === null ? `{${key}}` : String(value);
    });
  }

  tForLanguage(languageCode, key, vars = {}) {
    const translations = this.getTranslationsForLanguage(languageCode);
    const fallback = this.getTranslationsForLanguage('ar');
    const template = translations[key] || fallback[key] || key;
    return this.formatTemplate(template, vars);
  }

  async tForUser(userId, key, vars = {}) {
    const language = await this.getUserLanguage(userId);
    return this.tForLanguage(language, key, vars);
  }

  /**
   * الحصول على اللغة المفضلة للمستخدم
   */
  async getUserLanguage(userId) {
    try {
      const user = await User.findOne({ userId });
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

      await User.findOneAndUpdate({ userId }, { language: languageCode });
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
  getLanguagesMenu(languageCode = 'ar') {
    const translations = this.getTranslationsForLanguage(languageCode);
    let text = `${translations.languages_menu_title}\n\n${translations.languages_available}\n`;

    for (const [code, lang] of Object.entries(this.languages)) {
      text += `• ${lang.name}\n`;
    }

    text += `\n${translations.language_choose}\n\n${translations.languages_note}`;
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
