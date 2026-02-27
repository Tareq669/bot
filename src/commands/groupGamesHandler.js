const Markup = require('telegraf/markup');
const { Group, User } = require('../database/models');

const GROUP_TYPES = new Set(['group', 'supergroup']);

const QUICK_QUESTIONS = [
  { question: 'ما عاصمة السعودية؟', answers: ['الرياض'], reward: 8 },
  { question: 'ما عاصمة مصر؟', answers: ['القاهرة', 'القاهره'], reward: 8 },
  { question: 'ما عاصمة المغرب؟', answers: ['الرباط'], reward: 8 },
  { question: 'ما عاصمة الإمارات؟', answers: ['أبوظبي', 'ابوظبي'], reward: 8 },
  { question: 'كم يوم في الأسبوع؟', answers: ['7', 'سبعة', 'سبعه'], reward: 7 },
  { question: 'كم دقيقة في الساعة؟', answers: ['60', 'ستون'], reward: 7 },
  { question: 'كم ساعة في اليوم؟', answers: ['24'], reward: 7 },
  { question: 'كم ناتج 9 + 6 ؟', answers: ['15'], reward: 6 },
  { question: 'كم ناتج 12 × 3 ؟', answers: ['36'], reward: 7 },
  { question: 'كم ناتج 100 ÷ 4 ؟', answers: ['25'], reward: 7 },
  { question: 'ما الكوكب الأحمر؟', answers: ['المريخ'], reward: 8 },
  { question: 'ما أكبر محيط في العالم؟', answers: ['المحيط الهادي', 'الهادي'], reward: 10 },
  { question: 'كم عدد القارات؟', answers: ['7'], reward: 8 },
  { question: 'من مخترع المصباح الكهربائي؟', answers: ['توماس اديسون', 'اديسون'], reward: 9 },
  { question: 'ما الغاز الذي نتنفسه؟', answers: ['الأكسجين', 'الاكسجين', 'اكسجين'], reward: 8 },
  { question: 'ما اللغة الرسمية في البرازيل؟', answers: ['البرتغالية', 'برتغالية'], reward: 10 },
  { question: 'ما أكبر قارة؟', answers: ['آسيا', 'اسيا'], reward: 9 },
  { question: 'كم ضلعًا للمثلث؟', answers: ['3'], reward: 6 },
  { question: 'ما أصغر عدد أولي؟', answers: ['2'], reward: 7 },
  { question: 'ما عاصمة اليابان؟', answers: ['طوكيو'], reward: 9 },
  { question: 'ما عاصمة ألمانيا؟', answers: ['برلين'], reward: 9 },
  { question: 'ما عاصمة فرنسا؟', answers: ['باريس'], reward: 9 },
  { question: 'ما عاصمة إيطاليا؟', answers: ['روما'], reward: 9 },
  { question: 'ما عاصمة كندا؟', answers: ['أوتاوا', 'اوتاوا'], reward: 9 },
  { question: 'كم عدد حروف اللغة العربية؟', answers: ['28'], reward: 9 },
  { question: 'ما الفصل الذي يلي الصيف؟', answers: ['الخريف'], reward: 7 },
  { question: 'ما الحيوان الملقب بسفينة الصحراء؟', answers: ['الجمل'], reward: 7 },
  { question: 'ما أكبر كوكب في المجموعة الشمسية؟', answers: ['المشتري'], reward: 9 },
  { question: 'ما أقرب كوكب للشمس؟', answers: ['عطارد'], reward: 9 },
  { question: 'في أي قارة تقع مصر؟', answers: ['أفريقيا', 'افريقيا'], reward: 8 }
];

const MCQ_QUESTIONS = [
  { question: 'ما أكبر كوكب؟', options: ['المريخ', 'المشتري', 'زحل', 'الزهرة'], answerIndex: 1, reward: 1, category: 'culture' },
  { question: 'عاصمة اليابان؟', options: ['سيؤول', 'طوكيو', 'بكين', 'بانكوك'], answerIndex: 1, reward: 1, category: 'culture' },
  { question: 'ناتج 9 × 7 ؟', options: ['63', '56', '72', '49'], answerIndex: 0, reward: 1, category: 'math' },
  { question: 'العنصر O ؟', options: ['الأكسجين', 'الهيدروجين', 'الحديد', 'الذهب'], answerIndex: 0, reward: 1, category: 'culture' },
  { question: 'عدد القارات؟', options: ['5', '6', '7', '8'], answerIndex: 2, reward: 1, category: 'culture' },
  { question: 'عاصمة فرنسا؟', options: ['باريس', 'روما', 'برلين', 'مدريد'], answerIndex: 0, reward: 1, category: 'culture' },
  { question: 'كم ساعة في اليوم؟', options: ['12', '18', '24', '30'], answerIndex: 2, reward: 1, category: 'math' },
  { question: 'ناتج 100 ÷ 5 ؟', options: ['10', '15', '20', '25'], answerIndex: 2, reward: 1, category: 'math' },
  { question: 'أكبر محيط؟', options: ['الأطلسي', 'الهندي', 'الهادي', 'المتجمد'], answerIndex: 2, reward: 1, category: 'culture' },
  { question: 'عاصمة ألمانيا؟', options: ['برلين', 'ميونخ', 'فرانكفورت', 'هامبورغ'], answerIndex: 0, reward: 1, category: 'culture' }
];

const RELIGIOUS_MCQ_QUESTIONS = [
  { question: 'كم عدد أركان الإسلام؟', options: ['4', '5', '6', '7'], answerIndex: 1, reward: 1, category: 'religious' },
  { question: 'كم عدد الصلوات المفروضة يوميًا؟', options: ['3', '4', '5', '6'], answerIndex: 2, reward: 1, category: 'religious' },
  { question: 'ما أول سورة في القرآن؟', options: ['البقرة', 'الفاتحة', 'الإخلاص', 'يس'], answerIndex: 1, reward: 1, category: 'religious' },
  { question: 'في أي شهر يصوم المسلمون؟', options: ['شعبان', 'رمضان', 'محرم', 'رجب'], answerIndex: 1, reward: 1, category: 'religious' },
  { question: 'القبلة للمسلمين هي:', options: ['المسجد الأقصى', 'الكعبة', 'المسجد النبوي', 'مسجد قباء'], answerIndex: 1, reward: 1, category: 'religious' },
  { question: 'كم عدد أجزاء القرآن الكريم؟', options: ['20', '25', '30', '40'], answerIndex: 2, reward: 1, category: 'religious' },
  { question: 'كم عدد سور القرآن؟', options: ['110', '112', '114', '120'], answerIndex: 2, reward: 1, category: 'religious' },
  { question: 'أول مسجد بُني في الإسلام هو:', options: ['المسجد الحرام', 'مسجد قباء', 'المسجد النبوي', 'المسجد الأقصى'], answerIndex: 1, reward: 1, category: 'religious' },
  { question: 'ليلة القدر تكون في شهر:', options: ['شعبان', 'رمضان', 'رجب', 'ذو الحجة'], answerIndex: 1, reward: 1, category: 'religious' },
  { question: 'عدد أيام صيام رمضان غالبًا:', options: ['20', '25', '29 أو 30', '35'], answerIndex: 2, reward: 1, category: 'religious' },
  { question: 'الزكاة ركن رقم:', options: ['الأول', 'الثاني', 'الثالث', 'الرابع'], answerIndex: 2, reward: 1, category: 'religious' },
  { question: 'الحج يكون في شهر:', options: ['رمضان', 'ذو الحجة', 'محرم', 'شوال'], answerIndex: 1, reward: 1, category: 'religious' }
];

const SCIENCE_MCQ_QUESTIONS = [
  { question: 'ما الكوكب المعروف بالكوكب الأحمر؟', options: ['الزهرة', 'المريخ', 'عطارد', 'زحل'], answerIndex: 1, reward: 1, category: 'science' },
  { question: 'ما الغاز الأكثر وجودًا في الغلاف الجوي للأرض؟', options: ['الأكسجين', 'الهيدروجين', 'النيتروجين', 'ثاني أكسيد الكربون'], answerIndex: 2, reward: 1, category: 'science' },
  { question: 'ما الوحدة الأساسية لقياس شدة التيار الكهربائي؟', options: ['فولت', 'أوم', 'واط', 'أمبير'], answerIndex: 3, reward: 1, category: 'science' },
  { question: 'أي جزء في الخلية يُعد مركز التحكم؟', options: ['الغشاء', 'السيتوبلازم', 'النواة', 'الميتوكوندريا'], answerIndex: 2, reward: 1, category: 'science' },
  { question: 'ما الرمز الكيميائي للماء؟', options: ['CO2', 'H2O', 'O2', 'NaCl'], answerIndex: 1, reward: 1, category: 'science' },
  { question: 'كم عدد الكواكب في المجموعة الشمسية؟', options: ['7', '8', '9', '10'], answerIndex: 1, reward: 1, category: 'science' },
  { question: 'أين يحدث البناء الضوئي في النبات؟', options: ['الجذر', 'الساق', 'الورقة', 'الزهرة'], answerIndex: 2, reward: 1, category: 'science' },
  { question: 'ما الجهاز المسؤول عن ضخ الدم؟', options: ['الرئتان', 'الكبد', 'القلب', 'الكلى'], answerIndex: 2, reward: 1, category: 'science' },
  { question: 'أي الكواكب أقرب إلى الشمس؟', options: ['المريخ', 'الزهرة', 'عطارد', 'الأرض'], answerIndex: 2, reward: 1, category: 'science' },
  { question: 'ما الرمز الكيميائي للذهب؟', options: ['Ag', 'Au', 'Fe', 'Gd'], answerIndex: 1, reward: 1, category: 'science' },
  { question: 'ما سرعة الضوء تقريبًا؟', options: ['300 ألف كم/ث', '30 ألف كم/ث', '3 آلاف كم/ث', '3 مليون كم/ث'], answerIndex: 0, reward: 1, category: 'science' },
  { question: 'أي هذه الكواكب غازي عملاق؟', options: ['الأرض', 'المشتري', 'المريخ', 'عطارد'], answerIndex: 1, reward: 1, category: 'science' }
];

const CAPITALS_BANK = [
  ['السعودية', 'الرياض'], ['مصر', 'القاهرة'], ['المغرب', 'الرباط'], ['الجزائر', 'الجزائر'],
  ['تونس', 'تونس'], ['الأردن', 'عمان'], ['العراق', 'بغداد'], ['سوريا', 'دمشق'],
  ['لبنان', 'بيروت'], ['الإمارات', 'أبوظبي'], ['الكويت', 'الكويت'], ['قطر', 'الدوحة'],
  ['عُمان', 'مسقط'], ['اليمن', 'صنعاء'], ['تركيا', 'أنقرة'], ['اليابان', 'طوكيو'],
  ['فرنسا', 'باريس'], ['ألمانيا', 'برلين'], ['إيطاليا', 'روما'], ['إسبانيا', 'مدريد'],
  ['كندا', 'أوتاوا'], ['أستراليا', 'كانبيرا'], ['البرازيل', 'برازيليا'], ['الأرجنتين', 'بوينس آيرس'],
  ['المكسيك', 'مكسيكو سيتي'], ['الهند', 'نيودلهي'], ['الصين', 'بكين'], ['روسيا', 'موسكو'],
  ['إندونيسيا', 'جاكرتا'], ['جنوب أفريقيا', 'بريتوريا']
];

const buildGeneratedMathMcq = () => {
  const list = [];
  for (let i = 1; i <= 140; i += 1) {
    const a = (i % 29) + 3;
    const b = (i % 17) + 2;
    const mode = i % 4;
    let question = '';
    let answer = 0;
    if (mode === 0) {
      question = `كم ناتج ${a} + ${b} ؟`;
      answer = a + b;
    } else if (mode === 1) {
      question = `كم ناتج ${a + b} - ${b} ؟`;
      answer = a;
    } else if (mode === 2) {
      question = `كم ناتج ${a} × ${b} ؟`;
      answer = a * b;
    } else {
      question = `كم ناتج ${(a * b)} ÷ ${b} ؟`;
      answer = a;
    }
    const wrong1 = answer + ((i % 5) + 1);
    const wrong2 = Math.max(0, answer - ((i % 4) + 1));
    const wrong3 = answer + ((i % 7) + 2);
    const options = [...new Set([String(answer), String(wrong1), String(wrong2), String(wrong3)])].slice(0, 4);
    while (options.length < 4) {
      options.push(String(Number(options[options.length - 1]) + 3));
    }
    list.push({
      question,
      options,
      answerIndex: options.indexOf(String(answer)),
      reward: 1,
      category: 'math'
    });
  }
  return list;
};

const buildGeneratedCapitalsMcq = () => {
  const capitals = CAPITALS_BANK.map((x) => x[1]);
  return CAPITALS_BANK.map(([country, capital], idx) => {
    const wrong = capitals.filter((c) => c !== capital).slice(idx % 10, (idx % 10) + 3);
    while (wrong.length < 3) {
      wrong.push(capitals[(idx + wrong.length + 5) % capitals.length]);
    }
    const options = [capital, ...wrong.slice(0, 3)];
    return {
      question: `ما عاصمة ${country}؟`,
      options,
      answerIndex: 0,
      reward: 1,
      category: 'culture'
    };
  });
};

const ALL_MCQ_QUESTIONS = [
  ...MCQ_QUESTIONS,
  ...RELIGIOUS_MCQ_QUESTIONS,
  ...SCIENCE_MCQ_QUESTIONS,
  ...buildGeneratedMathMcq(),
  ...buildGeneratedCapitalsMcq()
];

const DAILY_CHALLENGES = [
  { question: 'تحدي يومي: كم ناتج 14 × 7 ؟', answers: ['98'], reward: 25 },
  { question: 'تحدي يومي: اكتب اسم أطول نهر شائع عربيًا.', answers: ['النيل', 'نهر النيل'], reward: 25 },
  { question: 'تحدي يومي: ما عاصمة اليابان؟', answers: ['طوكيو'], reward: 25 },
  { question: 'تحدي يومي: ما العنصر الكيميائي O ؟', answers: ['الأكسجين', 'الاكسجين'], reward: 25 },
  { question: 'تحدي يومي: ما عاصمة تركيا؟', answers: ['أنقرة', 'انقرة'], reward: 25 },
  { question: 'تحدي يومي: ما أكبر كوكب؟', answers: ['المشتري'], reward: 25 }
];

const WORDS = [
  'مكتبة', 'مدرسة', 'هندسة', 'برمجة', 'رياضيات', 'ذكاء', 'تعاون', 'صداقة',
  'منافسة', 'تحدي', 'إنجاز', 'تطوير', 'حكمة', 'إبداع', 'نجاح', 'مغامرة',
  'تخطيط', 'إدارة', 'قيادة', 'تعلم', 'تركيز', 'حلول', 'فريق', 'سرعة'
];

const DEFAULT_VOTE_TOPICS = [
  { question: 'تصويت: أفضل وقت للعبة اليومية؟', options: ['بعد العصر', 'بعد المغرب', 'بعد العشاء'] },
  { question: 'تصويت: نزيد مستوى الصعوبة؟', options: ['نعم', 'متوسط', 'لا'] },
  { question: 'تصويت: أي لعبة تفضل؟', options: ['سؤال سريع', 'ترتيب كلمات', 'حساب ذهني', 'اختيارات'] }
];

const CELEBRATION_LINES = ['إجابة ممتازة!', 'مستوى قوي!', 'رد سريع جدًا!', 'أداء احترافي!'];
const GROUP_STORE = [
  // Paired titles (male/female) with equal prices
  { key: 'knight_m', title: '⚔️ الفارس', price: 45, type: 'title' },
  { key: 'knight_f', title: '⚔️ الفارسة', price: 45, type: 'title' },

  { key: 'warrior_m', title: '🛡️ المحارب', price: 70, type: 'title' },
  { key: 'warrior_f', title: '🛡️ المحاربة', price: 70, type: 'title' },

  { key: 'captain_m', title: '🎖️ القائد', price: 95, type: 'title' },
  { key: 'captain_f', title: '🎖️ القائدة', price: 95, type: 'title' },

  { key: 'sage_m', title: '🧠 الحكيم', price: 110, type: 'title' },
  { key: 'sage_f', title: '🧠 الحكيمة', price: 110, type: 'title' },

  { key: 'speed_m', title: '⚡ السريع', price: 120, type: 'title' },
  { key: 'speed_f', title: '⚡ السريعة', price: 120, type: 'title' },

  { key: 'star_m', title: '🌟 نجم الجروب', price: 130, type: 'title' },
  { key: 'star_f', title: '🌟 نجمة الجروب', price: 130, type: 'title' },

  { key: 'quiz_m', title: '🎓 سيد الكويز', price: 150, type: 'title' },
  { key: 'quiz_f', title: '🎓 سيدة الكويز', price: 150, type: 'title' },

  { key: 'king', title: '🤴 الملك', price: 170, type: 'title' },
  { key: 'queen', title: '👸 الملكة', price: 170, type: 'title' },

  { key: 'sultan', title: '🫅 السلطان', price: 220, type: 'title' },
  { key: 'sultana', title: '🫅 السلطانة', price: 220, type: 'title' },

  { key: 'emperor', title: '👑 الإمبراطور', price: 300, type: 'title' },
  { key: 'empress', title: '👑 الإمبراطورة', price: 300, type: 'title' },

  // Requested premium titles (male/female pairs with equal prices)
  { key: 'sharp_mind_m', title: '🧩 العقل الحاد', price: 340, type: 'title' },
  { key: 'sharp_mind_f', title: '🧩 العقل الحادة', price: 340, type: 'title' },

  { key: 'iron_hand_m', title: '🛡️ اليد الحديدية', price: 360, type: 'title' },
  { key: 'iron_hand_f', title: '🛡️ صاحبة اليد الحديدية', price: 360, type: 'title' },

  { key: 'mental_guide_m', title: '🏆 المرشد الذهني', price: 380, type: 'title' },
  { key: 'mental_guide_f', title: '🏆 المرشدة الذهنية', price: 380, type: 'title' },

  { key: 'group_lord_m', title: '👑 لورد الجروب', price: 400, type: 'title' },
  { key: 'group_lord_f', title: '👑 ليدي الجروب', price: 400, type: 'title' },

  { key: 'storm_king_m', title: '🌪️ ملك العاصفة', price: 430, type: 'title' },
  { key: 'storm_king_f', title: '🌪️ ملكة العاصفة', price: 430, type: 'title' },

  { key: 'shadow_king_m', title: '🌑 ملك الظل', price: 450, type: 'title' },
  { key: 'shadow_king_f', title: '🌑 ملكة الظل', price: 450, type: 'title' },

  { key: 'leader_m', title: '🎯 الزعيم', price: 470, type: 'title' },
  { key: 'leader_f', title: '🎯 الزعيمة', price: 470, type: 'title' },

  { key: 'ninja_m', title: '🥷 نينجا', price: 490, type: 'title' },

  { key: 'phoenix_m', title: '🔥 العنقاء', price: 520, type: 'title' },

  { key: 'dollar_master_m', title: '💵 سيد الدولار', price: 560, type: 'title' },
  { key: 'dollar_master_f', title: '💵 سيدة الدولار', price: 560, type: 'title' },

  // Keep only one "الأسطورة" as requested
  { key: 'legend', title: '🏆 الأسطورة', price: 360, type: 'title' },

  { key: 'diamond_m', title: '💎 سيد الماس', price: 430, type: 'title' },
  { key: 'diamond_f', title: '💎 سيدة الماس', price: 430, type: 'title' },

  // Single booster only
  { key: 'boost2x', title: '🚀 معزز دولار 2x (45 دقيقة)', price: 120, type: 'boost', multiplier: 2, minutes: 45 }
];
const MONTHLY_REWARDS = [120, 80, 50];
const DUEL_STAKE = 3;
const SCRATCH_TICKET_PRICE = 5;
const SCRATCH_MAX_DAILY_PLAYS = 10;
const SCRATCH_COOLDOWN_SEC = 20;
const LUCK_MIN_RANGE = 1;
const LUCK_MAX_RANGE = 1000;
const LUCK_DAILY_LIMIT = 10;
const LUCK_COOLDOWN_SEC = 6;
const LUCK_WIN_COUNT = 260;
const LUCK_WIN_MIN_PAYOUT = 5;
const LUCK_WIN_MAX_PAYOUT = 1000;
const CASTLE_UPGRADE_COOLDOWN_MIN = 10;
const TREASURE_COOLDOWN_MIN = 30;
const SHIELD_DURATION_MIN = 60;
const NORMAL_RESOURCE_UNIT_COST = 1 / 3;
const GOLD_RESOURCE_UNIT_COST = 1;
const MAX_NORMAL_RESOURCE_BUY = 300;
const MAX_GOLD_RESOURCE_BUY = 50;
const MAX_ARMY_BUY = 2000;
const ARMY_UNIT_PRICE = 1 / 10;
const ARMY_POWER_UPGRADE_UNITS = 1000;
const RESOURCE_KEYS = ['wood', 'stone', 'food', 'iron', 'gold'];
const RESOURCE_AR = {
  wood: 'خشب',
  stone: 'حجر',
  food: 'غذاء',
  iron: 'حديد',
  gold: 'ذهب'
};
const SCRATCH_OUTCOMES = [
  { label: '❌ لم تربح في هذه البطاقة', payout: 0, weight: 60 },
  { label: '💵 ربح بسيط', payout: 3, weight: 25 },
  { label: '💸 ربح ممتاز', payout: 10, weight: 10 },
  { label: '🏆 ربح كبير', payout: 30, weight: 4 },
  { label: '👑 جاكبوت', payout: 100, weight: 1 }
];
const UNIQUE_GIFTS = [
  { key: 'rose', name: '🌹 وردة', price: 2 },
  { key: 'bouquet', name: '💐 باقة ورود', price: 6 },
  { key: 'meal', name: '🍽️ وجبة', price: 4 },
  { key: 'car', name: '🚗 سيارة', price: 35 },
  { key: 'island', name: '🏝️ جزيرة', price: 90 },
  { key: 'plane', name: '✈️ طيارة', price: 110 },
  { key: 'diamond', name: '💎 ماسة', price: 75 },
  { key: 'tower', name: '🗼 برج', price: 140 },
  { key: 'city', name: '🏙️ مدينة', price: 260 },
  { key: 'cruise', name: '🛳️ سفينة سياحة', price: 180 },
  { key: 'villa', name: '🏡 فيلا', price: 70 },
  { key: 'house', name: '🏠 بيت', price: 45 },
  { key: 'palace', name: '🏰 قصر', price: 120 },
  { key: 'santa', name: '🎅 هدية بابا نويل', price: 18 }
];
const LOUNGE_PRODUCTS = {
  cigarette: {
    key: 'cigarette',
    name: '🚬 سيجارة',
    aliases: ['سيجارة', 'سيجاره', 'دخان', 'سيجارة عادية', 'cigarette'],
    price: 5,
    puffs: 5,
    needsLighter: true,
    igniteAliases: ['ولع سيجارة', 'توليع سيجارة', 'اشعل سيجارة', 'ولع دخان']
  },
  cigar: {
    key: 'cigar',
    name: '🟤 سيجار',
    aliases: ['سيجار', 'cigar'],
    price: 12,
    puffs: 8,
    needsLighter: true,
    igniteAliases: ['ولع سيجار', 'توليع سيجار', 'اشعل سيجار']
  },
  vape: {
    key: 'vape',
    name: '💨 فيب',
    aliases: ['فيب', 'vape', 'فيب جهاز', 'جهاز فيب'],
    price: 20,
    puffs: 20,
    needsLighter: false,
    igniteAliases: ['شغل فيب', 'ابدأ فيب', 'ولع فيب', 'فيب']
  },
  hookah: {
    key: 'hookah',
    name: '🫧 أرجيلة',
    aliases: ['ارجيلة', 'أرجيلة', 'شيشة', 'شيشة', 'hookah'],
    price: 25,
    baseStock: 25,
    market: true,
    puffs: 25,
    needsLighter: false,
    igniteAliases: ['جهز ارجيلة', 'تجهيز ارجيلة', 'شغل ارجيلة']
  },
  coffee: {
    key: 'coffee',
    name: '☕ قهوة',
    aliases: ['قهوة', 'قهوه', 'coffee'],
    price: 3,
    baseStock: 60,
    market: true
  },
  tea: {
    key: 'tea',
    name: '🍵 شاي',
    aliases: ['شاي', 'tea'],
    price: 2,
    baseStock: 60,
    market: true
  },
  juice: {
    key: 'juice',
    name: '🧃 عصير',
    aliases: ['عصير', 'juice'],
    price: 3,
    baseStock: 45,
    market: true
  },
  mojito: {
    key: 'mojito',
    name: '🍃 عصير موهيتو',
    aliases: ['موهيتو', 'عصير موهيتو', 'mojito'],
    price: 4,
    baseStock: 50,
    market: true
  },
  orange_juice: {
    key: 'orange_juice',
    name: '🍊 عصير برتقال',
    aliases: ['عصير برتقال', 'برتقال', 'orange juice'],
    price: 3,
    baseStock: 55,
    market: true
  },
  lemon_juice: {
    key: 'lemon_juice',
    name: '🍋 عصير ليمون',
    aliases: ['عصير ليمون', 'ليمون', 'lemon juice'],
    price: 3,
    baseStock: 55,
    market: true
  },
  fruit_juice: {
    key: 'fruit_juice',
    name: '🍹 عصير فواكه',
    aliases: ['عصير فواكه', 'فواكه', 'fruit juice'],
    price: 4,
    baseStock: 45,
    market: true
  },
  banana_juice: {
    key: 'banana_juice',
    name: '🍌 عصير موز',
    aliases: ['عصير موز', 'موز', 'banana juice'],
    price: 4,
    baseStock: 45,
    market: true
  },
  avocado_juice: {
    key: 'avocado_juice',
    name: '🥑 عصير افوكادو',
    aliases: ['عصير افوكادو', 'افوكادو', 'avocado juice'],
    price: 5,
    baseStock: 40,
    market: true
  },
  strawberry_juice: {
    key: 'strawberry_juice',
    name: '🍓 عصير فراولة',
    aliases: ['عصير فراولة', 'فراولة', 'strawberry juice'],
    price: 5,
    baseStock: 40,
    market: true
  },
  mango_juice: {
    key: 'mango_juice',
    name: '🥭 عصير مانجا',
    aliases: ['عصير مانجا', 'مانجا', 'mango juice'],
    price: 5,
    baseStock: 40,
    market: true
  },
  seven_up: {
    key: 'seven_up',
    name: '🥤 سفن أب',
    aliases: ['سفن اب', 'سفن أب', 'سڤن اب', '7up', 'seven up'],
    price: 2,
    baseStock: 70,
    market: true
  },
  cola: {
    key: 'cola',
    name: '🥤 كوكاكولا',
    aliases: ['كوكاكولا', 'كوكا كولا', 'coca cola', 'cola'],
    price: 2,
    baseStock: 70,
    market: true
  },
  mirinda: {
    key: 'mirinda',
    name: '🥤 ماريندا',
    aliases: ['ماريندا', 'mirinda'],
    price: 2,
    baseStock: 70,
    market: true
  },
  nescafe: {
    key: 'nescafe',
    name: '☕ نسكفيه',
    aliases: ['نسكفيه', 'نسكافيه', 'nescafe'],
    price: 4,
    baseStock: 45,
    market: true
  },
  cappuccino: {
    key: 'cappuccino',
    name: '☕ كابتشينو',
    aliases: ['كابتشينو', 'cappuccino'],
    price: 5,
    baseStock: 40,
    market: true
  },
  chai_latte: {
    key: 'chai_latte',
    name: '☕ شاي لاتيه',
    aliases: ['شاي لاتيه', 'لاتيه', 'chai latte'],
    price: 5,
    baseStock: 40,
    market: true
  },
  hot_chocolate: {
    key: 'hot_chocolate',
    name: '🍫 هوت شوكليت',
    aliases: ['هوت شوكليت', 'hot chocolate'],
    price: 6,
    baseStock: 35,
    market: true
  },
  hookah_head: {
    key: 'hookah_head',
    name: '🧱 راس أرجيلة',
    aliases: ['راس ارجيلة', 'راس أرجيلة', 'راس', 'حجر ارجيلة', 'hookah head'],
    price: 4,
    baseStock: 70,
    market: true
  },
  coal: {
    key: 'coal',
    name: '🔥 فحم',
    aliases: ['فحم', 'coal'],
    price: 3,
    baseStock: 90,
    market: true
  },
  molasses_apple: {
    key: 'molasses_apple',
    name: '🍎 معسل تفاح',
    aliases: ['معسل تفاح', 'تفاح', 'ارجيلة تفاح', 'أرجيلة تفاح', 'molasses apple'],
    price: 5,
    baseStock: 60,
    market: true
  },
  molasses_mint: {
    key: 'molasses_mint',
    name: '🌿 معسل نعناع',
    aliases: ['معسل نعناع', 'نعناع', 'ارجيلة نعناع', 'أرجيلة نعناع', 'molasses mint'],
    price: 5,
    baseStock: 60,
    market: true
  },
  vape_liquid: {
    key: 'vape_liquid',
    name: '🧴 سائل فيب',
    aliases: ['سائل فيب', 'ليكويد', 'liquid', 'vape liquid'],
    price: 6,
    baseStock: 50,
    market: true
  },
  lighter: {
    key: 'lighter',
    name: '🪔 قداحة',
    aliases: ['قداحة', 'ولاعة', 'قداحه', 'ولاعه', 'lighter'],
    price: 8,
    baseStock: 50,
    market: true,
    ignitionsPerUnit: 25
  }
};
const CAFE_CONSUMABLE_KEYS = new Set([
  'coffee', 'tea', 'juice',
  'mojito', 'orange_juice', 'lemon_juice', 'fruit_juice', 'banana_juice',
  'avocado_juice', 'strawberry_juice', 'mango_juice',
  'seven_up', 'cola', 'mirinda',
  'nescafe', 'cappuccino', 'chai_latte', 'hot_chocolate'
]);
const LOUNGE_PUFF_ALIASES = [/^هف{1,5}$/i, /^(?:نفس\s*ارجيلة|نفس\s*أرجيلة|نفس\s*دخان|فيب)$/i, /^نفخة\s*سيجار$/i];
const LOUNGE_PUFF_LINES = [
  '😶‍🌫️ نفس رايق... المزاج تمام.',
  '💨 هالنفخة زبطت الجو.',
  '🫰 نفس سريع وتركّزك صار أعلى.',
  '🔥 مزاج عالي... كمل على مهلك.',
  '😌 نفس مرتب... وخليك رايق.'
];
const LOUNGE_FINISH_LINES = {
  cigarette: [
    '🚬 وصلت للفلتر يا معلم... اشتري وحدة جديدة قبل ما تمسك الورق!',
    '🚬 فلتر وبس! السيجارة خلصت، جيب غيرها.',
    '🚬 آخر نفس راح... وصلت للفلتر، اشتري سيجارة جديدة.'
  ],
  cigar: [
    '🟤 السيجار خلص وصار ذكرى... جيب واحد فاخر جديد.',
    '🟤 خلص السيجار بالكامل، وقت التحديث.',
    '🟤 آخر نفخة سيجار... اطلب غيره.'
  ],
  vape: [
    '💨 الفيب فصل فجأة... البطارية نامت، بدك جهاز/شحنة جديدة.',
    '💨 السائل خلص والفيب صار فاضي... جهز واحد جديد.',
    '💨 ما ضل نفخات في الفيب، بدك تعبئة جديدة.'
  ],
  hookah: [
    '🔥 الراس انحرق بالكامل... اطلب غيره بسرعة.',
    '🫧 الأرجيلة خلصت، الراس اتحمّص... جهّز راس جديد.',
    '🔥 خلصت النفخات والراس اتحرق... بدها تبديل.'
  ],
  lighter: [
    '🪔 القداحة خلصت غاز... جيب قداحة جديدة يا بطل.',
    '🪔 ولاعة بلا نار! اشتري قداحة جديدة.',
    '🪔 الشرارة خلصت... بدك قداحة جديدة.'
  ]
};
const CAFE_WORK_COOLDOWN_MS = 45 * 60 * 1000;
const LOUNGE_DAILY_PUFF_LIMIT = 100;
const WHO_AM_I_BANK = [
  { clues: ['نبي الله', 'ابتلعه الحوت', 'دعا في الظلمات'], answers: ['يونس', 'يونس عليه السلام'] },
  { clues: ['قائد مسلم', 'فتح القدس', 'اسمه صلاح'], answers: ['صلاح الدين', 'صلاح الدين الايوبي'] },
  { clues: ['اخترع المصباح العملي', 'مخترع أمريكي'], answers: ['توماس اديسون', 'اديسون'] },
  { clues: ['كوكب أحمر', 'رابع كوكب من الشمس'], answers: ['المريخ'] },
  { clues: ['سورة هي أم الكتاب', 'أول سورة في المصحف'], answers: ['الفاتحة', 'سورة الفاتحة'] },
  { clues: ['أول الخلفاء الراشدين', 'اسمه عبد الله بن أبي قحافة', 'صديق النبي'], answers: ['ابو بكر', 'أبو بكر', 'ابو بكر الصديق'] },
  { clues: ['ثاني الخلفاء الراشدين', 'لقبه الفاروق', 'اشتهر بالعدل'], answers: ['عمر', 'عمر بن الخطاب'] },
  { clues: ['مدينة فلسطينية ساحلية', 'تسمى عروس البحر', 'فيها ميناء مشهور'], answers: ['يافا'] },
  { clues: ['كوكب ضخم غازي', 'أكبر كوكب', 'اسمه يبدأ بحرف الميم'], answers: ['المشتري'] },
  { clues: ['نبي كلّمه الله مباشرة', 'تلقى الألواح', 'من أولي العزم'], answers: ['موسى', 'موسى عليه السلام'] },
  { clues: ['العاصمة الأردنية', 'مدينة سبعة جبال', 'اسمها من 4 حروف'], answers: ['عمان'] },
  { clues: ['عنصر كيميائي رمزه Au', 'فلز ثمين', 'يستخدم بالحُلي'], answers: ['الذهب'] },
  { clues: ['شهر الصيام', 'تزاد فيه العبادة', 'يأتي قبل شوال'], answers: ['رمضان'] },
  { clues: ['أكبر محيط', 'يقع بين آسيا وأمريكا', 'اسمه يدل على السكون'], answers: ['المحيط الهادي', 'الهادي'] },
  { clues: ['لغة البرازيل', 'ليست إسبانية', 'لغة أوروبية'], answers: ['البرتغالية', 'برتغالية'] },
  { clues: ['مدينة فيها المسجد الأقصى', 'أولى القبلتين', 'عاصمة تاريخية'], answers: ['القدس'] },
  { clues: ['مخترع الهاتف', 'اسكتلندي الأصل', 'لقبه بيل'], answers: ['الكسندر جراهام بيل', 'غراهام بيل', 'بيل'] },
  { clues: ['نبي بُعث في مصر', 'اشتهر بتأويل الرؤى', 'دخل السجن ظلمًا'], answers: ['يوسف', 'يوسف عليه السلام'] },
  { clues: ['قارة تضم مصر', 'ثاني أكبر قارات العالم', 'اسمها يبدأ بألف'], answers: ['افريقيا', 'أفريقيا'] },
  { clues: ['عدد أركان الإسلام', 'أكثر من أربعة', 'أقل من ستة'], answers: ['5', 'خمسة'] },
  { clues: ['حيوان سفينة الصحراء', 'يصبر على العطش', 'له سنام'], answers: ['الجمل'] },
  { clues: ['عاصمة فرنسا', 'مدينة النور', 'برج إيفل فيها'], answers: ['باريس'] },
  { clues: ['أقرب كوكب للشمس', 'صغير الحجم', 'سريع الدوران'], answers: ['عطارد'] },
  { clues: ['أول مسجد بُني في الإسلام', 'في المدينة', 'اسمه من 4 أحرف'], answers: ['قباء', 'مسجد قباء'] },
  { clues: ['عنصر نتنفسه', 'رمزه O', 'ضروري للحياة'], answers: ['الاكسجين', 'الأكسجين'] },
  { clues: ['دولة عاصمتها أنقرة', 'بين آسيا وأوروبا', 'لغة أهلها التركية'], answers: ['تركيا'] },
  { clues: ['كاتب مسرحيات شهير', 'إنجليزي', 'من أعماله هاملت'], answers: ['شكسبير', 'ويليام شكسبير'] },
  { clues: ['أكبر قارة', 'فيها الصين والهند', 'شرق العالم'], answers: ['اسيا', 'آسيا'] },
  { clues: ['سورة قصيرة جدًا', 'تعدل ثلث القرآن', 'تبدأ بـ قل هو الله'], answers: ['الاخلاص', 'الإخلاص', 'سورة الإخلاص'] }
];
const RIDDLE_BANK = [
  { question: 'شيء كلما أخذت منه كبر، ما هو؟', answers: ['الحفرة', 'حفره'] },
  { question: 'يرى كل شيء وليس له عيون، ما هو؟', answers: ['المرآة', 'المراه'] },
  { question: 'بيت بلا أبواب ولا نوافذ، ما هو؟', answers: ['البيضة', 'بيضه'] },
  { question: 'ما الكلمة التي تبطل معناها إذا نطقنا بها؟', answers: ['الصمت'] },
  { question: 'يمشي بلا قدمين ويبكي بلا عينين، ما هو؟', answers: ['السحاب', 'الغيوم', 'الغيم'] },
  { question: 'له أوراق وليس نباتًا، ما هو؟', answers: ['الكتاب'] },
  { question: 'شيء إذا دخل الماء لا يبتل، ما هو؟', answers: ['الضوء'] },
  { question: 'ما الذي يُكسر دون أن يُمس؟', answers: ['الوعد'] },
  { question: 'ما الذي يزيد كلما نقص؟', answers: ['العمر'] },
  { question: 'ما الشيء الذي له أسنان ولا يعض؟', answers: ['المشط'] },
  { question: 'شيء في السماء وإذا أضفت له حرفًا أصبح في الأرض، ما هو؟', answers: ['نجم', 'منجم'] },
  { question: 'ما الشيء الذي يكتب ولا يقرأ؟', answers: ['القلم'] },
  { question: 'ما الشيء الذي يقرصك ولا تراه؟', answers: ['الجوع'] },
  { question: 'ما الشيء الذي كلما مشى فقد جزءًا من ذيله؟', answers: ['الابرة', 'الإبرة'] },
  { question: 'شيء لا يدخل إلا إذا ضُرب على رأسه، ما هو؟', answers: ['المسمار'] },
  { question: 'أين البحر الذي لا يوجد فيه ماء؟', answers: ['الخريطة', 'الخريطه'] },
  { question: 'ما الذي يجري ولا يمشي؟', answers: ['الماء', 'النهر'] },
  { question: 'ما الذي له رأس ولا عين له؟', answers: ['الدبوس'] },
  { question: 'ما الشيء الذي إذا لمسته صاح؟', answers: ['الجرس'] },
  { question: 'له عين واحدة ولا يرى، ما هو؟', answers: ['الابرة', 'الإبرة'] },
  { question: 'أخضر في الأرض، أسود في السوق، أحمر في البيت، ما هو؟', answers: ['الشاي'] },
  { question: 'ما الشيء الذي يحمل قنطارًا ولا يحمل مسمارًا؟', answers: ['البحر'] },
  { question: 'ما هو الشيء الذي كل الناس يحتاجونه لكنه لا يأكل؟', answers: ['الملعقة'] },
  { question: 'شيء موجود في كل بيت، إذا أكل لا يشبع، ما هو؟', answers: ['النار'] },
  { question: 'شيء نأكله قبل أن يولد، ما هو؟', answers: ['البيض', 'البيضة', 'بيضه'] },
  { question: 'شيء كلما زاد نقص، ما هو؟', answers: ['العمر'] },
  { question: 'شيء من الزجاج يخترق الحديد ولا ينكسر، ما هو؟', answers: ['الضوء'] },
  { question: 'حيوان إذا جاع أكل أولاده، ما هو؟', answers: ['الاسد', 'الأسد'] },
  { question: 'ما الذي ينام ولا يقوم؟', answers: ['النار'] }
];
const TYPING_WORDS = [
  'فلسطين', 'المتسابق', 'البرمجة', 'التحدي', 'الذكاء', 'الإنجاز', 'السرعة', 'التركيز', 'التعاون', 'الاستمرارية',
  'المنافسة', 'النجاح', 'الإبداع', 'الاجتهاد', 'التفكير', 'المعلومة', 'المهارة', 'الخبرة', 'القراءة', 'المعرفة',
  'الرياضيات', 'الفيزياء', 'الكيمياء', 'الأحياء', 'التاريخ', 'الجغرافيا', 'الابتكار', 'الهدف', 'المستوى', 'المتفوق',
  'الامتحان', 'المنطق', 'الاستنتاج', 'المحاولة', 'المرونة', 'الالتزام', 'التخطيط', 'التطوير', 'التحفيز', 'المبادرة',
  'الذكريات', 'النهضة', 'الازدهار', 'التوازن', 'الوضوح', 'الدقة', 'السرعة_العالية', 'التحديات', 'الاحتراف', 'المجد'
];
const CHANCE_CHALLENGES = [
  'اكتب نكتة قصيرة في سطر واحد',
  'أرسل 3 إيموجي تعبّر عن مزاجك الآن',
  'جاوب: ما عاصمة الأردن؟',
  'اكتب دعاء قصير',
  'اذكر فائدة واحدة للقراءة'
];
const LEVEL_TIERS = [
  { index: 1, key: 'bronze', name: 'البرونزي', icon: '🥉', minXp: 0, maxXp: 99 },
  { index: 2, key: 'silver', name: 'الفضي', icon: '🥈', minXp: 100, maxXp: 249 },
  { index: 3, key: 'gold', name: 'الذهبي', icon: '🥇', minXp: 250, maxXp: 499 },
  { index: 4, key: 'platinum', name: 'البلاتيني', icon: '🏆', minXp: 500, maxXp: 899 },
  { index: 5, key: 'diamond', name: 'الماسي', icon: '💎', minXp: 900, maxXp: Number.MAX_SAFE_INTEGER }
];

class GroupGamesHandler {
  static bot = null;
  static activeRounds = new Map();
  static roundTimers = new Map();
  static autoLoop = null;
  static activeMcq = new Map();
  static activeQuizPolls = new Map();
  static activeQuizSeries = new Map();
  static activeVotes = new Map();
  static activeVoteByChat = new Map();
  static activeDuels = new Map();
  static activeDuelByChat = new Map();
  static activeConfessions = new Map();
  static confessionQuestions = new Map();
  static activeCafeRequests = new Map();
  static activeHookahSessions = new Map();
  static lastQuestionByGroup = new Map();
  static questionQueues = new Map();
  static userCooldowns = new Map();
  static pendingLuckInputs = new Map();
  static luckDailyNumbersCache = null;
  static pendingAlliances = new Map();

  static isGroupChat(ctx) {
    return GROUP_TYPES.has(ctx?.chat?.type);
  }

  static getDateKey(date = new Date()) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  static getWeekKey(date = new Date()) {
    const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const diff = Math.floor((date - start) / 86400000);
    const week = Math.ceil((diff + start.getUTCDay() + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  static getMonthKey(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  static token(prefix = 'x') {
    return `${prefix}${Math.random().toString(36).slice(2, 8)}`;
  }

  static checkCooldown(ctx, key = 'global', ms = 1200) {
    const userId = Number(ctx?.from?.id || 0);
    if (!userId) return false;
    const k = `${userId}:${key}`;
    const now = Date.now();
    const until = this.userCooldowns.get(k) || 0;
    if (until > now) return true;
    this.userCooldowns.set(k, now + ms);
    return false;
  }

  static normalizeText(value) {
    if (typeof value !== 'string') return '';
    return value.toLowerCase().trim()
      .replace(/[ًٌٍَُِّْـ]/g, '')
      .replace(/[إأآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .replace(/\s+/g, ' ');
  }

  static normalizeArabicDigits(value) {
    return String(value || '')
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  }

  static escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static mentionUser(userId, label) {
    const id = Number(userId);
    const safeLabel = this.escapeHtml(label || String(userId));
    if (!Number.isFinite(id) || id <= 0) return safeLabel;
    return `<a href="tg://user?id=${id}">${safeLabel}</a>`;
  }

  static formatCurrency(amount) {
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    return `${value.toLocaleString('en-US')} دولار 💸`;
  }

  static defaultLoungeInventory() {
    return {
      coffee: 0,
      tea: 0,
      juice: 0,
      mojito: 0,
      orange_juice: 0,
      lemon_juice: 0,
      fruit_juice: 0,
      banana_juice: 0,
      avocado_juice: 0,
      strawberry_juice: 0,
      mango_juice: 0,
      seven_up: 0,
      cola: 0,
      mirinda: 0,
      nescafe: 0,
      cappuccino: 0,
      chai_latte: 0,
      hot_chocolate: 0,
      cigarette: 0,
      cigar: 0,
      vape: 0,
      vape_liquid: 0,
      hookah: 0,
      hookah_head: 0,
      coal: 0,
      molasses_apple: 0,
      molasses_mint: 0,
      lighter: 0,
      lighterFuel: 0
    };
  }

  static normalizeLoungeInventory(value = {}) {
    const base = { ...this.defaultLoungeInventory(), ...(value || {}) };
    Object.keys(this.defaultLoungeInventory()).forEach((k) => {
      base[k] = Math.max(0, Number(base[k] || 0));
    });
    return base;
  }

  static defaultLoungeState() {
    return {
      active: false,
      productKey: '',
      productName: '',
      puffsLeft: 0,
      totalPuffs: 0,
      startedAt: null
    };
  }

  static normalizeLoungeState(value = {}) {
    const s = { ...this.defaultLoungeState(), ...(value || {}) };
    s.active = Boolean(s.active);
    s.productKey = String(s.productKey || '');
    s.productName = String(s.productName || '');
    s.puffsLeft = Math.max(0, Number(s.puffsLeft || 0));
    s.totalPuffs = Math.max(0, Number(s.totalPuffs || 0));
    s.startedAt = s.startedAt || null;
    return s;
  }

  static defaultCafeProfile() {
    return {
      reputation: 0,
      mood: 0,
      moodUntil: null,
      workLastAt: null,
      ordersCompleted: 0,
      cafeEarnings: 0,
      weeklyCafeEarnings: 0,
      weeklyKey: '',
      puffDayKey: '',
      puffsToday: 0,
      hookahPuffs: 0,
      smokePuffs: 0,
      loungePuffs: 0
    };
  }

  static normalizeCafeProfile(value = {}) {
    const p = { ...this.defaultCafeProfile(), ...(value || {}) };
    p.reputation = Math.max(0, Number(p.reputation || 0));
    p.mood = Math.max(0, Number(p.mood || 0));
    p.ordersCompleted = Math.max(0, Number(p.ordersCompleted || 0));
    p.cafeEarnings = Math.max(0, Number(p.cafeEarnings || 0));
    p.weeklyCafeEarnings = Math.max(0, Number(p.weeklyCafeEarnings || 0));
    p.puffsToday = Math.max(0, Number(p.puffsToday || 0));
    p.hookahPuffs = Math.max(0, Number(p.hookahPuffs || 0));
    p.smokePuffs = Math.max(0, Number(p.smokePuffs || 0));
    p.loungePuffs = Math.max(0, Number(p.loungePuffs || 0));
    p.weeklyKey = String(p.weeklyKey || '');
    p.puffDayKey = String(p.puffDayKey || '');
    p.moodUntil = p.moodUntil || null;
    p.workLastAt = p.workLastAt || null;
    return p;
  }

  static normalizeLoungeToken(value) {
    const x = this.normalizeText(String(value || ''));
    if (!x) return null;
    for (const product of Object.values(LOUNGE_PRODUCTS)) {
      if ((product.aliases || []).some((a) => this.normalizeText(a) === x)) {
        return product.key;
      }
    }
    return null;
  }

  static pickLoungeFinishLine(productKey) {
    const lines = LOUNGE_FINISH_LINES[productKey] || ['✅ خلص العنصر.'];
    return this.pickRandom(lines);
  }

  static shuffleWord(word) {
    const chars = Array.from(word);
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const shuffled = chars.join('');
    if (shuffled === word && word.length > 1) return word.slice(1) + word[0];
    return shuffled;
  }

  static pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  static shuffleArray(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  static pickNonRepeating(items, key) {
    if (!Array.isArray(items) || items.length === 0) return null;
    if (items.length === 1) return items[0];
    const last = this.lastQuestionByGroup.get(key);
    const pool = items.filter((q) => (q.question || q.prompt || JSON.stringify(q)) !== last);
    const picked = this.pickRandom(pool.length > 0 ? pool : items);
    this.lastQuestionByGroup.set(key, picked.question || picked.prompt || JSON.stringify(picked));
    return picked;
  }

  static pickFromQueue(items, key) {
    if (!Array.isArray(items) || items.length === 0) return null;
    let state = this.questionQueues.get(key);
    if (!state || state.sourceSize !== items.length || !Array.isArray(state.queue) || state.queue.length === 0) {
      state = {
        sourceSize: items.length,
        queue: this.shuffleArray([...items])
      };
      this.questionQueues.set(key, state);
    }
    return state.queue.pop();
  }

  static parseCommandArgs(ctx) {
    const text = ctx.message?.text || '';
    const parts = text.trim().split(/\s+/);
    return parts.slice(1);
  }

  static parseDifficulty(arg) {
    const x = String(arg || '').toLowerCase();
    if (['easy', 'سهل'].includes(x)) return 'easy';
    if (['medium', 'متوسط'].includes(x)) return 'medium';
    if (['hard', 'صعب'].includes(x)) return 'hard';
    return null;
  }

  static parseCategory(arg) {
    const x = String(arg || '').toLowerCase();
    if (['ثقافي', 'ثقافيه', 'ثقافية', 'culture', 'cultural', 'عام', 'عامة'].includes(x)) return 'culture';
    if (['ديني', 'دينيه', 'دينية', 'religion', 'religious'].includes(x)) return 'religious';
    if (['رياضي', 'رياضيه', 'رياضية', 'math', 'رياضيات'].includes(x)) return 'math';
    if (['علمي', 'علميه', 'علمية', 'science', 'scientific'].includes(x)) return 'science';
    return null;
  }

  static parseQuizOptions(args = [], defaultTimeoutSec = 25) {
    let difficulty = null;
    let category = null;
    let timeoutSec = defaultTimeoutSec;
    args.forEach((arg) => {
      const d = this.parseDifficulty(arg);
      if (d) difficulty = d;
      const c = this.parseCategory(arg);
      if (c) category = c;
      const n = parseInt(String(arg), 10);
      if (Number.isInteger(n) && n >= 10 && n <= 120) timeoutSec = n;
    });
    return { difficulty, category, timeoutSec };
  }

  static questionMatchesDifficulty(question, difficulty) {
    if (!difficulty) return true;
    const text = String(question?.question || '');
    let sum = 0;
    for (let i = 0; i < text.length; i += 1) sum += text.charCodeAt(i);
    const bucket = sum % 3;
    if (difficulty === 'easy') return bucket === 0;
    if (difficulty === 'medium') return bucket === 1;
    if (difficulty === 'hard') return bucket === 2;
    return true;
  }

  static questionMatchesCategory(question, category) {
    if (!category) return true;
    return String(question?.category || 'culture') === String(category);
  }

  static async ensureGroupRecord(ctx) {
    const groupId = String(ctx.chat.id);
    const groupTitle = ctx.chat.title || 'Unknown Group';
    const groupType = ctx.chat.type || 'group';
    const group = await Group.findOneAndUpdate(
      { groupId },
      { $set: { groupTitle, groupType, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
    this.normalizeGroupState(group);
    return group;
  }

  static async ensureGroupRecordByChatId(chatId, groupTitle = 'Unknown Group', groupType = 'group') {
    const group = await Group.findOneAndUpdate(
      { groupId: String(chatId) },
      { $set: { groupTitle, groupType, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true }
    );
    this.normalizeGroupState(group);
    return group;
  }

  static normalizeGroupState(group) {
    if (!group.gameSystem) group.gameSystem = {};
    if (!group.gameSystem.settings) group.gameSystem.settings = { enabled: true, autoQuestions: false, intervalMinutes: 15, questionTimeoutSec: 25 };
    if (typeof group.gameSystem.settings.enabled !== 'boolean') group.gameSystem.settings.enabled = true;
    if (typeof group.gameSystem.settings.autoQuestions !== 'boolean') group.gameSystem.settings.autoQuestions = false;
    if (!Number.isInteger(group.gameSystem.settings.intervalMinutes)) group.gameSystem.settings.intervalMinutes = 15;
    if (!Number.isInteger(group.gameSystem.settings.questionTimeoutSec)) group.gameSystem.settings.questionTimeoutSec = 25;
    if (!group.settings) group.settings = {};
    if (!group.settings.tierUpRewards) {
      group.settings.tierUpRewards = { silver: 10, gold: 20, platinum: 35, diamond: 60 };
    } else {
      if (!Number.isFinite(group.settings.tierUpRewards.silver)) group.settings.tierUpRewards.silver = 10;
      if (!Number.isFinite(group.settings.tierUpRewards.gold)) group.settings.tierUpRewards.gold = 20;
      if (!Number.isFinite(group.settings.tierUpRewards.platinum)) group.settings.tierUpRewards.platinum = 35;
      if (!Number.isFinite(group.settings.tierUpRewards.diamond)) group.settings.tierUpRewards.diamond = 60;
    }

    if (!group.gameSystem.state) group.gameSystem.state = {};
    if (!group.gameSystem.state.lastAutoAt) group.gameSystem.state.lastAutoAt = null;
    if (!group.gameSystem.state.lastDailyKey) group.gameSystem.state.lastDailyKey = '';
    if (!group.gameSystem.state.weekKey) group.gameSystem.state.weekKey = this.getWeekKey();
    if (!group.gameSystem.state.monthKey) group.gameSystem.state.monthKey = this.getMonthKey();
    if (!group.gameSystem.state.lastMonthlyRewardKey) group.gameSystem.state.lastMonthlyRewardKey = '';

    if (!Array.isArray(group.gameSystem.scores)) group.gameSystem.scores = [];
    group.gameSystem.scores.forEach((row) => {
      if (!Number.isFinite(row.points)) row.points = 0;
      if (!Number.isFinite(row.weeklyPoints)) row.weeklyPoints = 0;
      if (!Number.isFinite(row.monthlyPoints)) row.monthlyPoints = 0;
      if (!Number.isFinite(row.xp)) row.xp = 0;
      const tier = this.resolveTierFromXp(row.xp);
      if (!Number.isFinite(row.level) || row.level < 1) row.level = tier.index;
      if (!row.tier) row.tier = tier.name;
      if (typeof row.customTitle !== 'boolean') row.customTitle = false;
      const normalizedTitle = this.normalizeText(String(row.title || ''));
      const isGenericTitle = !row.title || String(row.title || '') === 'مبتدئ' || normalizedTitle === this.normalizeText('مبتدئ');
      if (!row.customTitle && isGenericTitle) row.title = `${tier.icon} ${tier.name}`;
      if (!row.title) row.title = row.customTitle ? 'مبتدئ' : `${tier.icon} ${tier.name}`;
      if (!row.activeBoost) row.activeBoost = { multiplier: 1, expiresAt: null };
      if (!Number.isFinite(row.giftsSent)) row.giftsSent = 0;
      if (!Number.isFinite(row.giftsReceived)) row.giftsReceived = 0;
      if (!Array.isArray(row.giftInventory)) row.giftInventory = [];
      if (!row.scratchDayKey) row.scratchDayKey = '';
      if (!Number.isFinite(row.scratchPlaysToday)) row.scratchPlaysToday = 0;
      if (!Number.isFinite(row.scratchTotalPlays)) row.scratchTotalPlays = 0;
      if (!Number.isFinite(row.scratchTotalWins)) row.scratchTotalWins = 0;
      if (!Number.isFinite(row.scratchTotalPayout)) row.scratchTotalPayout = 0;
      if (!row.luckDayKey) row.luckDayKey = '';
      if (!Number.isFinite(row.luckPlaysToday)) row.luckPlaysToday = 0;
      if (!Number.isFinite(row.luckTotalPlays)) row.luckTotalPlays = 0;
      if (!Number.isFinite(row.luckTotalWins)) row.luckTotalWins = 0;
      if (!Number.isFinite(row.luckTotalPayout)) row.luckTotalPayout = 0;
      if (!row.luckUsedDayKey) row.luckUsedDayKey = '';
      if (!Array.isArray(row.luckUsedNumbers)) row.luckUsedNumbers = [];
      if (typeof row.castleCreated !== 'boolean') row.castleCreated = false;
      if (!Number.isFinite(row.castleLevel)) row.castleLevel = 1;
      if (!row.castleResources || typeof row.castleResources !== 'object') {
        row.castleResources = { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 };
      }
      RESOURCE_KEYS.forEach((k) => {
        if (!Number.isFinite(row.castleResources[k])) row.castleResources[k] = 0;
      });
      if (typeof row.barracksCreated !== 'boolean') row.barracksCreated = false;
      if (!Number.isFinite(row.barracksLevel)) row.barracksLevel = 1;
      if (!Number.isFinite(row.armyUnits)) row.armyUnits = 0;
      if (!Number.isFinite(row.armyPower)) row.armyPower = 0;
      if (!Number.isFinite(row.shieldCards)) row.shieldCards = 0;
      if (!Number.isFinite(row.duelWins)) row.duelWins = 0;
      if (!Number.isFinite(row.duelLosses)) row.duelLosses = 0;
      if (typeof row.arenaJoined !== 'boolean') row.arenaJoined = false;
      if (!row.investDayKey) row.investDayKey = '';
      row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
      row.loungeState = this.normalizeLoungeState(row.loungeState || {});
      row.cafeProfile = this.normalizeCafeProfile(row.cafeProfile || {});
    });
    if (!group.gameSystem.cafeMarket || typeof group.gameSystem.cafeMarket !== 'object') {
      group.gameSystem.cafeMarket = { dayKey: '', stocks: {}, sold: {} };
    }
    if (!Array.isArray(group.gameSystem.teams)) group.gameSystem.teams = [];
    if (!group.gameSystem.tournament) group.gameSystem.tournament = { active: false, season: 1, startedAt: null, endedAt: null, rewards: { first: 100, second: 60, third: 40 } };
    if (!group.gameSystem.tournament.rewards) group.gameSystem.tournament.rewards = { first: 100, second: 60, third: 40 };

    return group;
  }

  static getTierUpRewards(group) {
    const defaults = { silver: 10, gold: 20, platinum: 35, diamond: 60 };
    const cfg = group?.settings?.tierUpRewards || defaults;
    return {
      silver: Math.max(0, Number(cfg.silver) || defaults.silver),
      gold: Math.max(0, Number(cfg.gold) || defaults.gold),
      platinum: Math.max(0, Number(cfg.platinum) || defaults.platinum),
      diamond: Math.max(0, Number(cfg.diamond) || defaults.diamond)
    };
  }

  static resolveTierFromXp(xp) {
    const value = Math.max(0, Number(xp) || 0);
    return LEVEL_TIERS.find((t) => value >= t.minXp && value <= t.maxXp) || LEVEL_TIERS[0];
  }

  static nextTierFromXp(xp) {
    const current = this.resolveTierFromXp(xp);
    const next = LEVEL_TIERS.find((t) => t.index === current.index + 1) || null;
    if (!next) return null;
    return {
      ...next,
      remainingXp: Math.max(0, next.minXp - (Number(xp) || 0))
    };
  }

  static buildLevelsKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🥉 البرونزي', 'group:levels:bronze'),
        Markup.button.callback('🥈 الفضي', 'group:levels:silver')
      ],
      [
        Markup.button.callback('🥇 الذهبي', 'group:levels:gold'),
        Markup.button.callback('🏆 البلاتيني', 'group:levels:platinum')
      ],
      [
        Markup.button.callback('💎 الماسي', 'group:levels:diamond')
      ]
    ]);
  }

  static buildQuickStartKeyboard() {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('❓ سؤال سريع', 'group:quick:quiz'),
        Markup.button.callback('🎯 مين أنا', 'group:quick:who')
      ],
      [
        Markup.button.callback('🧠 ألغاز', 'group:quick:riddle'),
        Markup.button.callback('⚡ سرعة', 'group:quick:typing')
      ],
      [
        Markup.button.callback('⚔️ تحدي', 'group:quick:duel'),
        Markup.button.callback('🎲 روليت', 'group:quick:chance')
      ],
      [
        Markup.button.callback('👤 ملفي', 'group:quick:profile'),
        Markup.button.callback('🏁 المتصدرين', 'group:quick:leader')
      ],
      [
        Markup.button.callback('🏅 المستويات', 'group:quick:levels'),
        Markup.button.callback('🛒 المتجر', 'group:quick:store')
      ],
      [
        Markup.button.callback('🎁 الهدايا', 'group:quick:gifts'),
        Markup.button.callback('📦 ممتلكاتي', 'group:quick:assets')
      ],
      [
        Markup.button.callback('🪩 لاونج', 'group:quick:lounge'),
        Markup.button.callback('🧰 مستلزماتي', 'group:quick:supplies')
      ],
      [Markup.button.callback('📘 مساعدة', 'group:quick:help')]
    ]);
  }

  static async handleQuickStart(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return ctx.reply(
      '🚀 <b>القائمة السريعة للجروب</b>\n\n' +
      'اختر من الأزرار مباشرة.\n' +
      'لأبسط تجربة: استخدم فقط\n' +
      '• لعب\n' +
      '• ملفي\n' +
      '• متصدرين',
      { parse_mode: 'HTML', reply_markup: this.buildQuickStartKeyboard().reply_markup }
    );
  }

  static async handleQuickAction(ctx, action) {
    if (!this.isGroupChat(ctx)) return;
    if (this.checkCooldown(ctx, `quick:${action}`, 1500)) {
      if (ctx.callbackQuery) await ctx.answerCbQuery('تمهّل ثانية...', { show_alert: false }).catch(() => {});
      return;
    }
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    if (action === 'quiz') return this.handleQuizCommand(ctx);
    if (action === 'who') return this.handleWhoAmICommand(ctx);
    if (action === 'riddle') return this.handleRiddleCommand(ctx);
    if (action === 'typing') return this.handleTypingCommand(ctx);
    if (action === 'duel') return ctx.reply('⚔️ للتحدي: اكتب\n/gduel @username\nأو: تحدي @username');
    if (action === 'chance') return this.handleChanceCommand(ctx);
    if (action === 'profile') return this.handleGroupProfileCommand(ctx);
    if (action === 'leader') return this.handleLeaderCommand(ctx);
    if (action === 'levels') return this.handleLevelsCommand(ctx);
    if (action === 'store') return this.handleStoreCommand(ctx);
    if (action === 'gifts') return this.handleGiftCatalogCommand(ctx);
    if (action === 'assets') return this.handleAssetsCommand(ctx);
    if (action === 'lounge') return this.handleLoungeMenuCommand(ctx);
    if (action === 'supplies') return this.handleLoungeSuppliesCommand(ctx);
    if (action === 'help') return this.handleGamesHelp(ctx);
    return null;
  }

  static async handleLevelsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    const tier = this.resolveTierFromXp(row.xp || 0);
    const next = this.nextTierFromXp(row.xp || 0);
    const rewards = this.getTierUpRewards(group);
    await group.save();

    const text =
      '🏅 <b>لوحة المستويات</b>\n\n' +
      `مستواك الحالي: ${tier.icon} <b>${tier.name}</b>\n` +
      `XP الحالي: ${row.xp || 0}\n` +
      `${next ? `التالي: ${next.icon} ${next.name} (متبقي ${next.remainingXp} XP)\n` : 'وصلت أعلى مستوى (الماسي) 👑\n'}` +
      '\n🎁 <b>مكافآت الترقية:</b>\n' +
      `• فضي: +${rewards.silver}\n` +
      `• ذهبي: +${rewards.gold}\n` +
      `• بلاتيني: +${rewards.platinum}\n` +
      `• ماسي: +${rewards.diamond}\n\n` +
      'اضغط على أي مستوى لعرض التفاصيل.';

    return ctx.reply(text, { parse_mode: 'HTML', reply_markup: this.buildLevelsKeyboard().reply_markup });
  }

  static async handleLevelsAction(ctx, levelKey) {
    if (!this.isGroupChat(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    const map = {
      bronze: { icon: '🥉', name: 'البرونزي', min: 0, max: 99, perks: ['بداية التقدم', 'دخول كل ألعاب الجروب'] },
      silver: { icon: '🥈', name: 'الفضي', min: 100, max: 249, perks: ['مكافأة ترقية تلقائية', 'فرص أسرع للصعود بالترتيب'] },
      gold: { icon: '🥇', name: 'الذهبي', min: 250, max: 499, perks: ['مكافأة ترقية أعلى', 'ظهور أقوى في المتصدرين'] },
      platinum: { icon: '🏆', name: 'البلاتيني', min: 500, max: 899, perks: ['مكافأة ترقية كبيرة', 'مكانة قوية في الجروب'] },
      diamond: { icon: '💎', name: 'الماسي', min: 900, max: '∞', perks: ['أعلى مستوى', 'أقوى مكافأة ترقية'] }
    };
    const x = map[String(levelKey || '').toLowerCase()];
    if (!x) return;
    const text =
      `${x.icon} <b>مستوى ${x.name}</b>\n\n` +
      `نطاق XP: <b>${x.min} - ${x.max}</b>\n` +
      `المزايا:\n• ${x.perks.join('\n• ')}`;
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static getOrCreateScoreRow(group, user) {
    const userId = Number(user.id);
    let row = group.gameSystem.scores.find((s) => Number(s.userId) === userId);
    if (!row) {
      const freshRow = {
        userId,
        username: user.username || user.first_name || String(userId),
        points: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        xp: 0,
        level: 1,
        tier: 'البرونزي',
        title: '🥉 البرونزي',
        customTitle: false,
        activeBoost: { multiplier: 1, expiresAt: null },
        giftsSent: 0,
        giftsReceived: 0,
        giftInventory: [],
        scratchDayKey: '',
        scratchPlaysToday: 0,
        scratchLastPlayAt: null,
        scratchTotalPlays: 0,
        scratchTotalWins: 0,
        scratchTotalPayout: 0,
        luckDayKey: '',
        luckPlaysToday: 0,
        luckLastPlayAt: null,
        luckTotalPlays: 0,
        luckTotalWins: 0,
        luckTotalPayout: 0,
        luckUsedDayKey: '',
        luckUsedNumbers: [],
        castleCreated: false,
        castleLevel: 1,
        castleLastUpgradeAt: null,
        castleResources: { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 },
        barracksCreated: false,
        barracksLevel: 1,
        armyUnits: 0,
        armyPower: 0,
        shieldCards: 0,
        shieldUntil: null,
        treasureLastAt: null,
        duelWins: 0,
        duelLosses: 0,
        arenaJoined: false,
        investDayKey: '',
        investLastAt: null,
        loungeInventory: this.defaultLoungeInventory(),
        loungeState: this.defaultLoungeState(),
        cafeProfile: this.defaultCafeProfile(),
        wins: 0,
        streak: 0,
        bestStreak: 0,
        lastWinDate: null,
        updatedAt: new Date()
      };
      group.gameSystem.scores.push(freshRow);
      row = group.gameSystem.scores[group.gameSystem.scores.length - 1];
    }
    row.username = user.username || user.first_name || String(userId);
    if (!Array.isArray(row.giftInventory)) row.giftInventory = [];
    if (!row.scratchDayKey) row.scratchDayKey = '';
    if (!Number.isFinite(row.scratchPlaysToday)) row.scratchPlaysToday = 0;
    if (!Number.isFinite(row.scratchTotalPlays)) row.scratchTotalPlays = 0;
    if (!Number.isFinite(row.scratchTotalWins)) row.scratchTotalWins = 0;
    if (!Number.isFinite(row.scratchTotalPayout)) row.scratchTotalPayout = 0;
    if (!row.luckDayKey) row.luckDayKey = '';
    if (!Number.isFinite(row.luckPlaysToday)) row.luckPlaysToday = 0;
    if (!Number.isFinite(row.luckTotalPlays)) row.luckTotalPlays = 0;
    if (!Number.isFinite(row.luckTotalWins)) row.luckTotalWins = 0;
    if (!Number.isFinite(row.luckTotalPayout)) row.luckTotalPayout = 0;
    if (!row.luckUsedDayKey) row.luckUsedDayKey = '';
    if (!Array.isArray(row.luckUsedNumbers)) row.luckUsedNumbers = [];
    if (typeof row.castleCreated !== 'boolean') row.castleCreated = false;
    if (!Number.isFinite(row.castleLevel)) row.castleLevel = 1;
    if (!row.castleResources || typeof row.castleResources !== 'object') row.castleResources = { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 };
    RESOURCE_KEYS.forEach((k) => {
      if (!Number.isFinite(row.castleResources[k])) row.castleResources[k] = 0;
    });
    if (typeof row.barracksCreated !== 'boolean') row.barracksCreated = false;
    if (!Number.isFinite(row.barracksLevel)) row.barracksLevel = 1;
    if (!Number.isFinite(row.armyUnits)) row.armyUnits = 0;
    if (!Number.isFinite(row.armyPower)) row.armyPower = 0;
    if (!Number.isFinite(row.shieldCards)) row.shieldCards = 0;
    if (!Number.isFinite(row.duelWins)) row.duelWins = 0;
    if (!Number.isFinite(row.duelLosses)) row.duelLosses = 0;
    if (typeof row.arenaJoined !== 'boolean') row.arenaJoined = false;
    if (!row.investDayKey) row.investDayKey = '';
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.loungeState = this.normalizeLoungeState(row.loungeState || {});
    row.cafeProfile = this.normalizeCafeProfile(row.cafeProfile || {});
    return row;
  }

  static defaultGlobalGameProfile() {
    return {
      migrated: false,
      points: 0,
      giftsSent: 0,
      giftsReceived: 0,
      giftInventory: [],
      scratchDayKey: '',
      scratchPlaysToday: 0,
      scratchLastPlayAt: null,
      scratchTotalPlays: 0,
      scratchTotalWins: 0,
      scratchTotalPayout: 0,
      luckDayKey: '',
      luckPlaysToday: 0,
      luckLastPlayAt: null,
      luckTotalPlays: 0,
      luckTotalWins: 0,
      luckTotalPayout: 0,
      luckUsedDayKey: '',
      luckUsedNumbers: [],
      investDayKey: '',
      investLastAt: null,
      castleCreated: false,
      castleLevel: 1,
      castleLastUpgradeAt: null,
      castleResources: { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 },
      barracksCreated: false,
      barracksLevel: 1,
      armyUnits: 0,
      armyPower: 0,
      shieldCards: 0,
      shieldUntil: null,
      treasureLastAt: null,
      duelWins: 0,
      duelLosses: 0,
      arenaJoined: false,
      loungeInventory: this.defaultLoungeInventory(),
      loungeState: this.defaultLoungeState(),
      cafeProfile: this.defaultCafeProfile()
    };
  }

  static normalizeGlobalGameProfile(profile = {}) {
    const p = { ...this.defaultGlobalGameProfile(), ...(profile || {}) };
    p.points = Number(p.points || 0);
    p.giftsSent = Number(p.giftsSent || 0);
    p.giftsReceived = Number(p.giftsReceived || 0);
    p.giftInventory = Array.isArray(p.giftInventory) ? p.giftInventory.map((x) => ({
      key: String(x?.key || ''),
      name: String(x?.name || x?.key || ''),
      count: Math.max(0, Number(x?.count || 0))
    })).filter((x) => x.key && x.count > 0) : [];
    p.scratchPlaysToday = Number(p.scratchPlaysToday || 0);
    p.scratchTotalPlays = Number(p.scratchTotalPlays || 0);
    p.scratchTotalWins = Number(p.scratchTotalWins || 0);
    p.scratchTotalPayout = Number(p.scratchTotalPayout || 0);
    p.luckPlaysToday = Number(p.luckPlaysToday || 0);
    p.luckTotalPlays = Number(p.luckTotalPlays || 0);
    p.luckTotalWins = Number(p.luckTotalWins || 0);
    p.luckTotalPayout = Number(p.luckTotalPayout || 0);
    p.luckUsedNumbers = Array.isArray(p.luckUsedNumbers) ? p.luckUsedNumbers.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= LUCK_MAX_RANGE) : [];
    p.castleCreated = Boolean(p.castleCreated);
    p.castleLevel = Math.max(1, Number(p.castleLevel || 1));
    p.castleResources = p.castleResources && typeof p.castleResources === 'object' ? p.castleResources : { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 };
    RESOURCE_KEYS.forEach((k) => { p.castleResources[k] = Number(p.castleResources[k] || 0); });
    p.barracksCreated = Boolean(p.barracksCreated);
    p.barracksLevel = Math.max(1, Number(p.barracksLevel || 1));
    p.armyUnits = Number(p.armyUnits || 0);
    p.armyPower = Number(p.armyPower || 0);
    p.shieldCards = Number(p.shieldCards || 0);
    p.duelWins = Number(p.duelWins || 0);
    p.duelLosses = Number(p.duelLosses || 0);
    p.arenaJoined = Boolean(p.arenaJoined);
    p.loungeInventory = this.normalizeLoungeInventory(p.loungeInventory || {});
    p.loungeState = this.normalizeLoungeState(p.loungeState || {});
    p.cafeProfile = this.normalizeCafeProfile(p.cafeProfile || {});
    p.migrated = Boolean(p.migrated);
    return p;
  }

  static rowHasEconomyData(row) {
    return Boolean(
      Number(row?.points || 0) > 0
      || Number(row?.giftsSent || 0) > 0
      || Number(row?.giftsReceived || 0) > 0
      || (Array.isArray(row?.giftInventory) && row.giftInventory.some((x) => Number(x?.count || 0) > 0))
      || Boolean(row?.castleCreated)
      || Number(row?.armyUnits || 0) > 0
      || Number(row?.armyPower || 0) > 0
      || Number(row?.scratchTotalPlays || 0) > 0
      || Number(row?.luckTotalPlays || 0) > 0
      || Object.values(this.normalizeLoungeInventory(row?.loungeInventory || {})).some((n) => Number(n || 0) > 0)
      || Number(row?.cafeProfile?.cafeEarnings || 0) > 0
    );
  }

  static applyProfileToRow(profile, row) {
    const p = this.normalizeGlobalGameProfile(profile);
    row.points = p.points;
    row.giftsSent = p.giftsSent;
    row.giftsReceived = p.giftsReceived;
    row.giftInventory = p.giftInventory.map((x) => ({ key: x.key, name: x.name, count: x.count }));

    row.scratchDayKey = p.scratchDayKey || '';
    row.scratchPlaysToday = p.scratchPlaysToday;
    row.scratchLastPlayAt = p.scratchLastPlayAt || null;
    row.scratchTotalPlays = p.scratchTotalPlays;
    row.scratchTotalWins = p.scratchTotalWins;
    row.scratchTotalPayout = p.scratchTotalPayout;

    row.luckDayKey = p.luckDayKey || '';
    row.luckPlaysToday = p.luckPlaysToday;
    row.luckLastPlayAt = p.luckLastPlayAt || null;
    row.luckTotalPlays = p.luckTotalPlays;
    row.luckTotalWins = p.luckTotalWins;
    row.luckTotalPayout = p.luckTotalPayout;
    row.luckUsedDayKey = p.luckUsedDayKey || '';
    row.luckUsedNumbers = [...(p.luckUsedNumbers || [])];

    row.investDayKey = p.investDayKey || '';
    row.investLastAt = p.investLastAt || null;

    row.castleCreated = p.castleCreated;
    row.castleLevel = p.castleLevel;
    row.castleLastUpgradeAt = p.castleLastUpgradeAt || null;
    row.castleResources = { ...p.castleResources };
    row.barracksCreated = p.barracksCreated;
    row.barracksLevel = p.barracksLevel;
    row.armyUnits = p.armyUnits;
    row.armyPower = p.armyPower;
    row.shieldCards = p.shieldCards;
    row.shieldUntil = p.shieldUntil || null;
    row.treasureLastAt = p.treasureLastAt || null;
    row.duelWins = p.duelWins;
    row.duelLosses = p.duelLosses;
    row.arenaJoined = p.arenaJoined;
    row.loungeInventory = this.normalizeLoungeInventory(p.loungeInventory || {});
    row.loungeState = this.normalizeLoungeState(p.loungeState || {});
    row.cafeProfile = this.normalizeCafeProfile(p.cafeProfile || {});
  }

  static applyRowToProfile(row, profile) {
    const p = this.normalizeGlobalGameProfile(profile);
    p.points = Number(row.points || 0);
    p.giftsSent = Number(row.giftsSent || 0);
    p.giftsReceived = Number(row.giftsReceived || 0);
    p.giftInventory = Array.isArray(row.giftInventory) ? row.giftInventory.map((x) => ({
      key: String(x?.key || ''),
      name: String(x?.name || x?.key || ''),
      count: Math.max(0, Number(x?.count || 0))
    })).filter((x) => x.key && x.count > 0) : [];

    p.scratchDayKey = row.scratchDayKey || '';
    p.scratchPlaysToday = Number(row.scratchPlaysToday || 0);
    p.scratchLastPlayAt = row.scratchLastPlayAt || null;
    p.scratchTotalPlays = Number(row.scratchTotalPlays || 0);
    p.scratchTotalWins = Number(row.scratchTotalWins || 0);
    p.scratchTotalPayout = Number(row.scratchTotalPayout || 0);

    p.luckDayKey = row.luckDayKey || '';
    p.luckPlaysToday = Number(row.luckPlaysToday || 0);
    p.luckLastPlayAt = row.luckLastPlayAt || null;
    p.luckTotalPlays = Number(row.luckTotalPlays || 0);
    p.luckTotalWins = Number(row.luckTotalWins || 0);
    p.luckTotalPayout = Number(row.luckTotalPayout || 0);
    p.luckUsedDayKey = row.luckUsedDayKey || '';
    p.luckUsedNumbers = Array.isArray(row.luckUsedNumbers) ? row.luckUsedNumbers.map((n) => Number(n)).filter(Number.isInteger) : [];

    p.investDayKey = row.investDayKey || '';
    p.investLastAt = row.investLastAt || null;

    p.castleCreated = Boolean(row.castleCreated);
    p.castleLevel = Math.max(1, Number(row.castleLevel || 1));
    p.castleLastUpgradeAt = row.castleLastUpgradeAt || null;
    p.castleResources = p.castleResources || { wood: 0, stone: 0, food: 0, iron: 0, gold: 0 };
    RESOURCE_KEYS.forEach((k) => { p.castleResources[k] = Number(row.castleResources?.[k] || 0); });
    p.barracksCreated = Boolean(row.barracksCreated);
    p.barracksLevel = Math.max(1, Number(row.barracksLevel || 1));
    p.armyUnits = Number(row.armyUnits || 0);
    p.armyPower = Number(row.armyPower || 0);
    p.shieldCards = Number(row.shieldCards || 0);
    p.shieldUntil = row.shieldUntil || null;
    p.treasureLastAt = row.treasureLastAt || null;
    p.duelWins = Number(row.duelWins || 0);
    p.duelLosses = Number(row.duelLosses || 0);
    p.arenaJoined = Boolean(row.arenaJoined);
    p.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    p.loungeState = this.normalizeLoungeState(row.loungeState || {});
    p.cafeProfile = this.normalizeCafeProfile(row.cafeProfile || {});
    p.migrated = true;
    return p;
  }

  static async ensureGlobalProfileAndSyncRow(row, userRef = {}) {
    const userId = Number(userRef.id || userRef.userId);
    if (!userId) return null;
    const update = {
      $setOnInsert: {
        userId,
        firstName: userRef.first_name || userRef.firstName || userRef.username || `user_${userId}`,
        username: userRef.username || '',
        joinDate: new Date()
      }
    };
    const userDoc = await User.findOneAndUpdate({ userId }, update, { upsert: true, new: true });
    userDoc.globalGameProfile = this.normalizeGlobalGameProfile(userDoc.globalGameProfile || {});

    if (!userDoc.globalGameProfile.migrated) {
      if (this.rowHasEconomyData(row)) {
        userDoc.globalGameProfile = this.applyRowToProfile(row, userDoc.globalGameProfile);
      } else {
        this.applyProfileToRow(userDoc.globalGameProfile, row);
        userDoc.globalGameProfile.migrated = true;
      }
      await userDoc.save();
    } else {
      this.applyProfileToRow(userDoc.globalGameProfile, row);
    }
    return userDoc;
  }

  static async syncRowToGlobal(userDoc, row) {
    if (!userDoc) return;
    userDoc.globalGameProfile = this.applyRowToProfile(row, userDoc.globalGameProfile || {});
    await userDoc.save();
  }

  static awardXp(row, xpAmount) {
    const gain = Math.max(0, Number(xpAmount) || 0);
    const oldTier = this.resolveTierFromXp(row.xp || 0);
    row.xp = (row.xp || 0) + gain;
    const newTier = this.resolveTierFromXp(row.xp);
    const oldLevel = Number(row.level) || oldTier.index;
    row.level = newTier.index;
    row.tier = newTier.name;
    if (!row.customTitle) {
      row.title = `${newTier.icon} ${newTier.name}`;
    }
    return {
      leveledUp: newTier.index > oldTier.index,
      oldLevel,
      newLevel: newTier.index,
      oldTier,
      newTier
    };
  }

  static resolveGiftByInput(input) {
    const raw = String(input || '').trim().toLowerCase();
    if (!raw) return null;
    const normalizedRaw = this.normalizeText(raw);
    const rawNoAl = normalizedRaw.replace(/^ال/, '');
    return UNIQUE_GIFTS.find((g) => {
      const extraAliases = {
        meal: ['وجبة', 'وجبه', 'الوجبة', 'الوجبه', 'meal'],
        island: ['جزيرة', 'جزيره', 'الجزيرة', 'الجزيره', 'island'],
        plane: ['طيارة', 'طياره', 'الطيارة', 'الطياره', 'plane'],
        diamond: ['ماسة', 'ماسه', 'الماسة', 'الماسه', 'diamond'],
        tower: ['برج', 'البرج', 'tower'],
        city: ['مدينة', 'مدينه', 'المدينة', 'المدينه', 'city'],
        cruise: ['سفينة سياحة', 'سفينه سياحه', 'سفينة', 'سفينه', 'السفينة', 'السفينه', 'cruise'],
        palace: ['قصر', 'القصر', 'palace'],
        house: ['بيت', 'البيت', 'house'],
        villa: ['فيلا', 'الفيلا', 'villa'],
        rose: ['وردة', 'ورده', 'ورد', 'الوردة', 'الورده', 'الورد', 'ورود', 'الورود', 'rose'],
        bouquet: ['باقة ورود', 'باقه ورود', 'باقة', 'باقه', 'bouquet'],
        santa: ['هدية بابا نويل', 'هديه بابا نويل', 'هدية', 'هديه', 'santa'],
        car: ['سيارة', 'سياره', 'السيارة', 'السياره', 'car']
      };
      const aliases = [g.key, g.name, this.normalizeText(g.name), ...(extraAliases[g.key] || [])];
      return aliases.some((x) => {
        const nx = this.normalizeText(String(x));
        return nx === normalizedRaw || nx === rawNoAl;
      });
    }) || null;
  }

  static extractGiftInputFromArgs(args = []) {
    const noiseWords = new Set(['شراء', 'اشتري', 'بيع', 'ببيع', 'اهداء', 'إهداء', 'ارسال', 'إرسال', 'هدية', 'هديه', 'من', 'المتجر', 'لي', 'لنفسي', 'نفسي', 'x', '×']);
    const filtered = args.filter((x) => !noiseWords.has(this.normalizeText(String(x))) && !/^\d+$/.test(String(x)) && !String(x).startsWith('@'));
    return filtered.join(' ').trim();
  }

  static normalizeGiftInventoryList(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((x) => ({
        key: String(x?.key || '').trim(),
        name: String(x?.name || x?.key || '').trim(),
        count: Math.max(0, Number(x?.count || 0))
      }))
      .filter((x) => x.key && x.count > 0);
  }

  static upsertGiftInventory(row, gift, qtyDelta) {
    const delta = Number(qtyDelta || 0);
    if (!row || !gift || !Number.isFinite(delta) || delta === 0) return;

    const inventory = this.normalizeGiftInventoryList(row.giftInventory);
    const idx = inventory.findIndex((g) => g.key === gift.key);
    if (idx === -1) {
      if (delta > 0) {
        inventory.push({ key: gift.key, name: gift.name, count: delta });
      }
    } else {
      inventory[idx].count = Math.max(0, Number(inventory[idx].count || 0) + delta);
      if (inventory[idx].count <= 0) {
        inventory.splice(idx, 1);
      }
    }
    if (typeof row?.set === 'function') {
      row.set('giftInventory', inventory);
    } else {
      row.giftInventory = inventory;
    }
    if (typeof row?.markModified === 'function') {
      row.markModified('giftInventory');
    }
  }

  static rollScratchOutcome() {
    const totalWeight = SCRATCH_OUTCOMES.reduce((sum, x) => sum + Number(x.weight || 0), 0);
    let roll = Math.random() * totalWeight;
    for (const item of SCRATCH_OUTCOMES) {
      roll -= Number(item.weight || 0);
      if (roll <= 0) return item;
    }
    return SCRATCH_OUTCOMES[0];
  }

  static resetScratchDailyIfNeeded(row) {
    const today = this.getDateKey();
    if (row.scratchDayKey !== today) {
      row.scratchDayKey = today;
      row.scratchPlaysToday = 0;
    }
  }

  static resetLuckDailyIfNeeded(row) {
    const today = this.getDateKey();
    if (row.luckDayKey !== today) {
      row.luckDayKey = today;
      row.luckPlaysToday = 0;
    }
    if (row.luckUsedDayKey !== today) {
      row.luckUsedDayKey = today;
      row.luckUsedNumbers = [];
    }
  }

  static buildDailyLuckNumbers(dateKey = null) {
    const key = dateKey || this.getDateKey();
    if (this.luckDailyNumbersCache && this.luckDailyNumbersCache.key === key) {
      return this.luckDailyNumbersCache;
    }

    // Deterministic per day: random changes daily, ثابت داخل نفس اليوم.
    let seed = 0;
    for (const ch of key) seed = ((seed * 31) + ch.charCodeAt(0)) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const numbers = Array.from({ length: LUCK_MAX_RANGE }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const winners = new Set(numbers.slice(0, LUCK_WIN_COUNT));
    const payouts = {};
    winners.forEach((n) => {
      payouts[n] = Math.floor(rand() * (LUCK_WIN_MAX_PAYOUT - LUCK_WIN_MIN_PAYOUT + 1)) + LUCK_WIN_MIN_PAYOUT;
    });

    this.luckDailyNumbersCache = { key, winners, payouts };
    return this.luckDailyNumbersCache;
  }

  static evaluateLuckNumber(number) {
    const pool = this.buildDailyLuckNumbers();
    if (pool.winners.has(number)) {
      return { tier: 'رابح', win: true, payout: Number(pool.payouts[number] || LUCK_WIN_MIN_PAYOUT) };
    }
    return { tier: 'خاسر', win: false, payout: 0 };
  }

  static async processLuckPick(ctx, pickedNumber) {
    if (!this.isGroupChat(ctx)) return false;
    if (this.checkCooldown(ctx, 'luck', LUCK_COOLDOWN_SEC * 1000)) {
      await ctx.reply('⏳ تمهّل شوي قبل استخدام الحظ مرة ثانية.');
      return true;
    }

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    this.resetLuckDailyIfNeeded(row);
    const used = new Set((row.luckUsedNumbers || []).map((n) => Number(n)));
    if (used.has(Number(pickedNumber))) {
      await group.save();
      await ctx.reply('♻️ هذا الرقم استخدمته اليوم بالفعل. اختَر رقم ثاني.');
      return true;
    }
    if ((row.luckPlaysToday || 0) >= LUCK_DAILY_LIMIT) {
      await group.save();
      await ctx.reply(`🧾 وصلت الحد اليومي للمحاولات (${LUCK_DAILY_LIMIT}). ارجع بكرة.`);
      return true;
    }

    const result = this.evaluateLuckNumber(pickedNumber);
    const before = Number(row.points || 0);
    const winAmount = Number(result.payout || 0);
    row.points = before + winAmount;
    row.luckPlaysToday = Number(row.luckPlaysToday || 0) + 1;
    row.luckUsedNumbers = Array.isArray(row.luckUsedNumbers) ? row.luckUsedNumbers : [];
    row.luckUsedNumbers.push(Number(pickedNumber));
    row.luckTotalPlays = Number(row.luckTotalPlays || 0) + 1;
    if (result.win) row.luckTotalWins = Number(row.luckTotalWins || 0) + 1;
    row.luckTotalPayout = Number(row.luckTotalPayout || 0) + winAmount;
    row.luckLastPlayAt = new Date();
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    const mention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');
    await ctx.reply(
      `${mention}\n` +
      `• ${result.win ? 'مبروك فزت بالحظ' : 'حظ أوفر المرة الجاية'}\n` +
      `• الرقم المختار ↢ ( ${pickedNumber} )\n` +
      `• مستوى الحظ ↢ ( ${result.tier} )\n` +
      `• فلوسك قبل ↢ ( ${this.formatCurrency(before)} )\n` +
      `• فلوسك الآن ↢ ( ${this.formatCurrency(row.points || 0)} )\n` +
      `• قيمة الحظ ↢ ( ${result.win ? '+' : ''}${this.formatCurrency(winAmount)} )\n` +
      `• محاولاتك اليوم ↢ ( ${row.luckPlaysToday}/${LUCK_DAILY_LIMIT} )\n` +
      `• أرقام مستخدمة اليوم ↢ ( ${(row.luckUsedNumbers || []).length} )`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
    return true;
  }

  static resolveTargetUser(ctx, group, arg) {
    const replyUser = ctx.message?.reply_to_message?.from;
    if (replyUser && !replyUser.is_bot) return replyUser;

    const raw = String(arg || '').trim();
    if (!raw) return null;
    if (/^\d+$/.test(raw)) {
      const id = Number(raw);
      const found = (group.gameSystem.scores || []).find((s) => Number(s.userId) === id);
      return found ? { id, username: found.username, first_name: found.username } : { id, first_name: String(id) };
    }
    const clean = raw.replace(/^@/, '').toLowerCase();
    const found = (group.gameSystem.scores || []).find((s) => String(s.username || '').replace(/^@/, '').toLowerCase() === clean);
    if (!found) return null;
    return { id: Number(found.userId), username: found.username, first_name: found.username };
  }

  static async isGroupAdmin(ctx, userId = null) {
    if (!this.isGroupChat(ctx)) return false;
    const targetUserId = userId || ctx.from?.id;
    if (!targetUserId) return false;
    try {
      const member = await ctx.telegram.getChatMember(ctx.chat.id, targetUserId);
      return ['creator', 'administrator'].includes(member.status);
    } catch (_error) {
      return false;
    }
  }

  static async isGroupOwnerManager(ctx, group, userId = null) {
    const targetUserId = Number(userId || ctx.from?.id || 0);
    if (!targetUserId) return false;
    return targetUserId === 1584983530;
  }

  static async handleOwnerGrantMoneyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);

    const isAllowed = await this.isGroupOwnerManager(ctx, group);
    if (!isAllowed) {
      return ctx.reply('❌ هذا الأمر متاح فقط للمالك @JOAmeer.');
    }

    const args = this.parseCommandArgs(ctx);
    const amountToken = args.find((x) => /^-?\d+$/.test(String(x || '').trim()));
    if (!amountToken) {
      return ctx.reply('❌ الصيغة:\n/ggrantmoney 1000 @user\nأو بالرد: /ggrantmoney 1000\nأو عربي: منح فلوس 1000 @user');
    }

    const amount = Number.parseInt(String(amountToken), 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      return ctx.reply('❌ المبلغ لازم يكون رقم صحيح أكبر من 0.');
    }

    const targetArg = args.find((x) => {
      const t = String(x || '').trim();
      if (!t) return false;
      if (t === amountToken) return false;
      return t.startsWith('@') || /^\d+$/.test(t);
    });
    const targetUser = this.resolveTargetUser(ctx, group, targetArg) || ctx.from;

    const row = this.getOrCreateScoreRow(group, targetUser);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, {
      id: Number(targetUser.id),
      username: targetUser.username || targetUser.first_name || String(targetUser.id),
      first_name: targetUser.first_name || targetUser.username || String(targetUser.id)
    });

    const before = Number(row.points || 0);
    row.points = before + amount;
    row.updatedAt = new Date();

    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    const actorMention = this.mentionUser(
      ctx.from?.id,
      ctx.from?.first_name || ctx.from?.username || 'المالك'
    );
    const targetMention = this.mentionUser(
      targetUser.id,
      targetUser.first_name || targetUser.username || String(targetUser.id)
    );

    return ctx.reply(
      `✅ <b>تم منح الفلوس بنجاح</b>\n\n` +
      `• بواسطة: ${actorMention}\n` +
      `• للمستخدم: ${targetMention}\n` +
      `• المبلغ: +${this.formatCurrency(amount)}\n` +
      `• الرصيد قبل: ${this.formatCurrency(before)}\n` +
      `• الرصيد بعد: ${this.formatCurrency(row.points || 0)}`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static async handleOwnerTakeMoneyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);

    const isAllowed = await this.isGroupOwnerManager(ctx, group);
    if (!isAllowed) {
      return ctx.reply('❌ هذا الأمر متاح فقط للمالك @JOAmeer.');
    }

    const args = this.parseCommandArgs(ctx);
    const amountToken = args.find((x) => /^-?\d+$/.test(String(x || '').trim()));
    if (!amountToken) {
      return ctx.reply('❌ الصيغة:\n/gtakemoney 1000 @user\nأو بالرد: /gtakemoney 1000\nأو عربي: سحب فلوس 1000 @user');
    }

    const amount = Number.parseInt(String(amountToken), 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      return ctx.reply('❌ المبلغ لازم يكون رقم صحيح أكبر من 0.');
    }

    const targetArg = args.find((x) => {
      const t = String(x || '').trim();
      if (!t) return false;
      if (t === amountToken) return false;
      return t.startsWith('@') || /^\d+$/.test(t);
    });
    const targetUser = this.resolveTargetUser(ctx, group, targetArg) || ctx.from;

    const row = this.getOrCreateScoreRow(group, targetUser);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, {
      id: Number(targetUser.id),
      username: targetUser.username || targetUser.first_name || String(targetUser.id),
      first_name: targetUser.first_name || targetUser.username || String(targetUser.id)
    });

    const before = Number(row.points || 0);
    if (before <= 0) {
      return ctx.reply('❌ رصيد المستخدم بالفعل 0.');
    }

    const deducted = Math.min(amount, before);
    row.points = before - deducted;
    row.updatedAt = new Date();

    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    const actorMention = this.mentionUser(
      ctx.from?.id,
      ctx.from?.first_name || ctx.from?.username || 'المالك'
    );
    const targetMention = this.mentionUser(
      targetUser.id,
      targetUser.first_name || targetUser.username || String(targetUser.id)
    );

    return ctx.reply(
      `✅ <b>تم سحب الفلوس بنجاح</b>\n\n` +
      `• بواسطة: ${actorMention}\n` +
      `• من المستخدم: ${targetMention}\n` +
      `• المبلغ المسحوب: -${this.formatCurrency(deducted)}\n` +
      `• الرصيد قبل: ${this.formatCurrency(before)}\n` +
      `• الرصيد بعد: ${this.formatCurrency(row.points || 0)}`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static setup(bot) {
    this.bot = bot;
    if (this.autoLoop) return;
    this.autoLoop = setInterval(() => {
      this.runAutoQuestionLoop().catch(() => {});
    }, 60 * 1000);
  }

  static clearRound(groupId) {
    const key = String(groupId);
    this.activeRounds.delete(key);
    const timer = this.roundTimers.get(key);
    if (timer) clearTimeout(timer);
    this.roundTimers.delete(key);
  }

  static async runAutoQuestionLoop() {
    const groups = await Group.find({ 'gameSystem.settings.autoQuestions': true });
    for (const group of groups) {
      this.normalizeGroupState(group);
      if (!group.gameSystem.settings.enabled) continue;
      const groupId = String(group.groupId);
      if (this.activeRounds.has(groupId)) continue;
      const intervalMinutes = Math.max(5, group.gameSystem.settings.intervalMinutes || 15);
      const lastAutoAt = group.gameSystem.state.lastAutoAt ? new Date(group.gameSystem.state.lastAutoAt).getTime() : 0;
      if (Date.now() - lastAutoAt < intervalMinutes * 60 * 1000) continue;

      const base = this.pickNonRepeating(QUICK_QUESTIONS, `auto:${groupId}`);
      await this.startRoundInternal(Number(group.groupId), {
        type: 'quiz',
        prompt: `⚡ <b>سؤال تلقائي</b>\n\n${base.question}`,
        answers: base.answers,
        reward: base.reward,
        timeoutSec: Math.max(10, group.gameSystem.settings.questionTimeoutSec || 25)
      }, true);

      group.gameSystem.state.lastAutoAt = new Date();
      await group.save();
    }
  }

  static async startRoundInternal(chatId, roundPayload, isAuto = false) {
    const groupId = String(chatId);
    this.clearRound(groupId);

    const deadline = Date.now() + roundPayload.timeoutSec * 1000;
    this.activeRounds.set(groupId, {
      ...roundPayload,
      reward: 1,
      answersNorm: roundPayload.answers.map((a) => this.normalizeText(String(a))),
      deadline,
      allowedUserIds: Array.isArray(roundPayload.allowedUserIds) ? roundPayload.allowedUserIds.map((x) => Number(x)) : null,
      onWin: typeof roundPayload.onWin === 'function' ? roundPayload.onWin : null
    });

    const sent = await this.bot.telegram.sendMessage(
      Number(chatId),
      `${roundPayload.prompt}\n\n⏱️ المدة: ${roundPayload.timeoutSec} ثانية\n💰 الجائزة: ${this.formatCurrency(1)}`,
      { parse_mode: 'HTML' }
    );

    const timeout = setTimeout(async () => {
      const active = this.activeRounds.get(groupId);
      if (!active) return;
      this.clearRound(groupId);
      await this.bot.telegram.sendMessage(
        Number(chatId),
        `⌛ انتهى الوقت.\n✅ الإجابة الصحيحة: <b>${active.answers[0]}</b>${isAuto ? '\n\nسؤال تلقائي جديد لاحقًا.' : ''}`,
        { parse_mode: 'HTML', reply_to_message_id: sent.message_id }
      ).catch(() => {});
    }, roundPayload.timeoutSec * 1000);

    this.roundTimers.set(groupId, timeout);
  }
  static buildDailyRound() {
    const daily = this.pickRandom(DAILY_CHALLENGES);
    return { type: 'daily', prompt: `🧠 <b>التحدي اليومي</b>\n\n${daily.question}`, answers: daily.answers, reward: 1, timeoutSec: 120 };
  }

  static buildQuizRound(difficulty = null, groupId = null) {
    const pool = QUICK_QUESTIONS.filter((q) => this.questionMatchesDifficulty(q, difficulty));
    const effectivePool = pool.length > 0 ? pool : QUICK_QUESTIONS;
    const key = `quiz:${String(groupId || 'global')}`;
    const quiz = this.pickNonRepeating(effectivePool, key);
    return { type: 'quiz', prompt: `❓ <b>سؤال سريع</b>\n\n${quiz.question}`, answers: quiz.answers, reward: 1, timeoutSec: 30 };
  }

  static buildMathRound() {
    const a = Math.floor(Math.random() * 25) + 5;
    const b = Math.floor(Math.random() * 20) + 2;
    const ops = ['+', '-', '*'];
    const op = this.pickRandom(ops);
    const answer = op === '+' ? (a + b) : op === '-' ? (a - b) : (a * b);
    return { type: 'math', prompt: `➗ <b>تحدي حساب ذهني</b>\n\nما ناتج: <b>${a} ${op} ${b}</b> ؟`, answers: [String(answer)], reward: 1, timeoutSec: 25 };
  }

  static buildWordRound() {
    const word = this.pickRandom(WORDS);
    const shuffled = this.shuffleWord(word);
    return { type: 'word', prompt: `🔤 <b>ترتيب كلمة</b>\n\nرتّب هذه الأحرف: <b>${shuffled}</b>`, answers: [word], reward: 1, timeoutSec: 35 };
  }

  static buildWhoAmIRound() {
    const q = this.pickNonRepeating(WHO_AM_I_BANK, 'whoami:global');
    const clues = this.shuffleArray(q.clues).slice(0, 3).map((c, i) => `${i + 1}) ${c}`).join('\n');
    return {
      type: 'whoami',
      prompt: `🎯 <b>لعبة: مين أنا؟</b>\n\n${clues}\n\nأول شخص يكتب الإجابة الصحيحة يكسب 1 دولار.`,
      answers: q.answers,
      reward: 1,
      timeoutSec: 40
    };
  }

  static buildRiddleRound() {
    const q = this.pickNonRepeating(RIDDLE_BANK, 'riddle:global');
    return {
      type: 'riddle',
      prompt: `🧠 <b>لغز ذكي</b>\n\n${q.question}\n\nأول إجابة صحيحة = 1 دولار.`,
      answers: q.answers,
      reward: 1,
      timeoutSec: 45
    };
  }

  static buildTypingRound() {
    const word = this.pickNonRepeating(TYPING_WORDS.map((w) => ({ question: w, answers: [w] })), 'typing:global').question;
    return {
      type: 'typing',
      prompt: `⚡ <b>سرعة الكتابة</b>\n\nاكتب الكلمة التالية خلال 10 ثواني:\n<b>${word}</b>`,
      answers: [word],
      reward: 1,
      timeoutSec: 10
    };
  }

  static async sendQuizPoll(chatId, question, reward, timeoutSec = 25) {
    if (!this.bot) return null;
    const shuffled = this.shuffleArray(question.options.map((opt, idx) => ({ opt, original: idx })));
    const correctOptionId = shuffled.findIndex((x) => x.original === question.answerIndex);
    const options = shuffled.map((x) => x.opt);
    const openPeriod = Math.min(600, Math.max(10, Number(timeoutSec || 25)));

    const sent = await this.bot.telegram.sendPoll(Number(chatId), question.question, options, {
      type: 'quiz',
      is_anonymous: false,
      allows_multiple_answers: false,
      correct_option_id: correctOptionId,
      open_period: openPeriod,
      explanation: 'اختر الإجابة الصحيحة'
    });

    const pollId = sent?.poll?.id;
    if (!pollId) return sent;

    const cleanup = setTimeout(() => {
      this.activeQuizPolls.delete(pollId);
    }, (openPeriod + 5) * 1000);

    this.activeQuizPolls.set(pollId, {
      chatId: String(chatId),
      reward: 1,
      correctOptionId,
      awardedUsers: new Set(),
      cleanup
    });
    return sent;
  }

  static async handlePollAnswer(ctx) {
    const answer = ctx.update?.poll_answer;
    if (!answer) return;

    const state = this.activeQuizPolls.get(answer.poll_id);
    if (!state) return;

    const userId = Number(answer.user?.id);
    if (!userId) return;
    if (state.awardedUsers.has(userId)) return;

    const selected = Array.isArray(answer.option_ids) ? answer.option_ids : [];
    const isCorrect = selected.includes(state.correctOptionId);
    if (!isCorrect) return;

    state.awardedUsers.add(userId);

    const group = await this.ensureGroupRecordByChatId(state.chatId);
    const scoreMeta = await this.updateScore(group, answer.user, state.reward);
    group.updatedAt = new Date();
    await group.save();

    const rank = this.getUserRank(group, userId);
    const boostLine = scoreMeta.boostActive ? '\n🚀 تم تطبيق معزز الدولار' : '';
    const tierLine = scoreMeta.tier ? `\n🏅 المستوى: ${scoreMeta.tier}` : '';
    const tierBonusLine = scoreMeta.tierUpBonus > 0 ? `\n🎉 مكافأة ترقية +${scoreMeta.tierUpBonus}` : '';
    await this.bot.telegram.sendMessage(
      Number(state.chatId),
      `✅ ${answer.user?.first_name || 'لاعب'} أجاب صحيحًا!\n💰 +${this.formatCurrency(scoreMeta.finalReward)}${boostLine}${tierBonusLine}${tierLine}\n🏅 الترتيب: #${rank || '-'}`,
      { parse_mode: 'HTML' }
    ).catch(() => {});
  }

  static getUserRank(group, userId) {
    const list = [...(group.gameSystem.scores || [])].sort((a, b) => (b.points || 0) - (a.points || 0));
    const idx = list.findIndex((x) => Number(x.userId) === Number(userId));
    return idx >= 0 ? idx + 1 : null;
  }

  static getUserTeam(group, userId) {
    return (group.gameSystem.teams || []).find((t) => Array.isArray(t.members) && t.members.includes(Number(userId))) || null;
  }

  static findTeamByName(group, name) {
    const normalized = this.normalizeText(name);
    return (group.gameSystem.teams || []).find((t) => this.normalizeText(t.name || '') === normalized) || null;
  }

  static async addRewardPointsToMember(group, userId, amount) {
    if (!amount || amount <= 0) return;
    let row = group.gameSystem.scores.find((s) => Number(s.userId) === Number(userId));
    if (!row) {
      const freshRow = {
        userId: Number(userId),
        username: String(userId),
        points: 0,
        weeklyPoints: 0,
        monthlyPoints: 0,
        xp: 0,
        level: 1,
        tier: 'البرونزي',
        title: '🥉 البرونزي',
        customTitle: false,
        activeBoost: { multiplier: 1, expiresAt: null },
        giftsSent: 0,
        giftsReceived: 0,
        giftInventory: [],
        wins: 0,
        streak: 0,
        bestStreak: 0,
        lastWinDate: null,
        updatedAt: new Date()
      };
      group.gameSystem.scores.push(freshRow);
      row = group.gameSystem.scores[group.gameSystem.scores.length - 1];
    }
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, { id: Number(userId), username: row.username, first_name: row.username });
    row.points = (row.points || 0) + amount;
    row.weeklyPoints = (row.weeklyPoints || 0) + amount;
    row.monthlyPoints = (row.monthlyPoints || 0) + amount;
    this.awardXp(row, amount);
    row.updatedAt = new Date();
    await this.syncRowToGlobal(userDoc, row);
  }

  static async updateScore(group, user, reward) {
    this.normalizeGroupState(group);
    const weekKey = this.getWeekKey();
    const monthKey = this.getMonthKey();
    if (group.gameSystem.state.weekKey !== weekKey) {
      group.gameSystem.state.weekKey = weekKey;
      group.gameSystem.scores.forEach((s) => { s.weeklyPoints = 0; });
    }
    if (group.gameSystem.state.monthKey !== monthKey) {
      group.gameSystem.state.monthKey = monthKey;
      group.gameSystem.scores.forEach((s) => { s.monthlyPoints = 0; });
    }

    const userId = Number(user.id);
    const row = this.getOrCreateScoreRow(group, user);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, user);
    const now = Date.now();
    const boostActive = row.activeBoost?.expiresAt && new Date(row.activeBoost.expiresAt).getTime() > now;
    const multiplier = boostActive ? Math.max(1, Number(row.activeBoost?.multiplier) || 1) : 1;
    const effectiveReward = Math.max(1, Math.round(reward * multiplier));

    row.points = (row.points || 0) + effectiveReward;
    row.weeklyPoints = (row.weeklyPoints || 0) + effectiveReward;
    row.monthlyPoints = (row.monthlyPoints || 0) + effectiveReward;
    row.wins = (row.wins || 0) + 1;
    row.updatedAt = new Date();
    const progress = this.awardXp(row, effectiveReward);

    const todayKey = this.getDateKey();
    const yesterdayKey = this.getDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const lastWinKey = row.lastWinDate ? this.getDateKey(new Date(row.lastWinDate)) : '';
    if (lastWinKey === todayKey) row.streak = Math.max(1, row.streak || 1);
    else if (lastWinKey === yesterdayKey) row.streak = (row.streak || 0) + 1;
    else row.streak = 1;

    row.bestStreak = Math.max(row.bestStreak || 0, row.streak || 1);
    row.lastWinDate = new Date();

    const streakBonus = 0;
    const rewardsCfg = this.getTierUpRewards(group);
    const tierBonusMap = {
      2: rewardsCfg.silver,
      3: rewardsCfg.gold,
      4: rewardsCfg.platinum,
      5: rewardsCfg.diamond
    };
    const tierUpBonus = progress.leveledUp ? (tierBonusMap[progress.newTier?.index] || 0) : 0;
    if (tierUpBonus > 0) {
      row.points = (row.points || 0) + tierUpBonus;
      row.weeklyPoints = (row.weeklyPoints || 0) + tierUpBonus;
      row.monthlyPoints = (row.monthlyPoints || 0) + tierUpBonus;
    }

    const finalReward = effectiveReward + streakBonus + tierUpBonus;
    if (group.gameSystem.tournament?.active) {
      const team = this.getUserTeam(group, userId);
      if (team) {
        team.points = (team.points || 0) + finalReward;
        team.updatedAt = new Date();
      }
    }

    await this.syncRowToGlobal(userDoc, row);

    return {
      finalReward,
      streakBonus,
      tierUpBonus,
      streak: row.streak || 0,
      level: row.level || 1,
      tier: row.tier || 'البرونزي',
      leveledUp: progress.leveledUp,
      boostActive: multiplier > 1
    };
  }

  static async handleIncomingGroupText(ctx, text) {
    if (!this.isGroupChat(ctx)) return false;
    if (!text || text.startsWith('/')) return false;

    const luckKey = `${String(ctx.chat.id)}:${Number(ctx.from?.id || 0)}`;
    if (this.pendingLuckInputs.has(luckKey)) {
      const normalized = this.normalizeArabicDigits(String(text || '').trim());
      const isKnownCommandLike = /^(شراء|بيع|اهداء|إهداء|ارسال|إرسال|متجر|هدايا|ممتلكاتي|حظ|كرسي|انهاء|إنهاء|سؤال|لاونج|كافيتيريا|قائمة|مزاجي|طلب|سلم|ولع|هف|انضم|نفس)\b/i.test(normalized);
      if (isKnownCommandLike) {
        // Do not let pending luck block normal group commands.
        this.pendingLuckInputs.delete(luckKey);
        return false;
      }
      if (!/^\d+$/.test(normalized)) {
        await ctx.reply('❌ اختَر رقم واحد فقط بين 1 و 1000.');
        return true;
      }
      const picked = parseInt(normalized, 10);
      if (!Number.isInteger(picked) || picked < LUCK_MIN_RANGE || picked > LUCK_MAX_RANGE) {
        await ctx.reply('❌ الرقم لازم يكون بين 1 و 1000.');
        return true;
      }
      this.pendingLuckInputs.delete(luckKey);
      return this.processLuckPick(ctx, picked);
    }

    const handledConfession = await this.handleIncomingConfessionText(ctx, text);
    if (handledConfession) return true;

    const norm = this.normalizeText(String(text || ''));
    if (norm === 'نفس') {
      const handledSessionPuff = await this.handleHookahSessionPuff(ctx);
      if (handledSessionPuff) return true;
    }

    const groupId = String(ctx.chat.id);
    const round = this.activeRounds.get(groupId);
    if (!round) return false;

    if (Date.now() > round.deadline) {
      this.clearRound(groupId);
      await ctx.reply(`⌛ انتهت الجولة.\n✅ الإجابة الصحيحة: ${round.answers[0]}`);
      return true;
    }

    if (Array.isArray(round.allowedUserIds) && round.allowedUserIds.length > 0) {
      const uid = Number(ctx.from?.id);
      if (!round.allowedUserIds.includes(uid)) return false;
    }

    const input = this.normalizeText(text);
    if (!round.answersNorm.includes(input)) return false;

    this.clearRound(groupId);
    const group = await this.ensureGroupRecord(ctx);
    const scoreMeta = await this.updateScore(group, ctx.from, round.reward);
    if (round.type === 'daily') group.gameSystem.state.lastDailyKey = this.getDateKey();
    group.updatedAt = new Date();
    if (typeof round.onWin === 'function') {
      await round.onWin({ group, winnerId: Number(ctx.from.id), winnerUser: ctx.from });
    }
    await group.save();

    const winnerName = ctx.from.first_name || ctx.from.username || String(ctx.from.id);
    const winner = this.mentionUser(ctx.from.id, winnerName);
    const rank = this.getUserRank(group, ctx.from.id);
    const team = this.getUserTeam(group, ctx.from.id);
    const hype = this.pickRandom(CELEBRATION_LINES);
    const bonusLine = scoreMeta.streakBonus > 0 ? `\n🔥 بونص ستريك +${scoreMeta.streakBonus}` : '';
    const tierBonusLine = scoreMeta.tierUpBonus > 0 ? `\n🎉 مكافأة ترقية +${scoreMeta.tierUpBonus}` : '';
    const boostLine = scoreMeta.boostActive ? '\n🚀 معزز الدولار مفعل' : '';
    const tierLine = scoreMeta.tier ? `\n🏅 المستوى: ${scoreMeta.tier}` : '';
    const teamLine = team ? `\n👥 فريقك: ${team.name} | رصيد الفريق: ${this.formatCurrency(team.points || 0)}` : '';
    const rankLine = rank ? `\n🏅 ترتيبك الحالي: #${rank}` : '';

    await ctx.reply(
      `🏆 ${winner} فاز بالجولة!\n✅ الإجابة صحيحة: <b>${round.answers[0]}</b>\n💰 +${this.formatCurrency(scoreMeta.finalReward)}${bonusLine}${tierBonusLine}${boostLine}${tierLine}\n🔥 الستريك: ${scoreMeta.streak}${rankLine}${teamLine}\n✨ ${hype}`,
      { parse_mode: 'HTML' }
    );
    return true;
  }

  static async canStartRound(ctx) {
    const group = await this.ensureGroupRecord(ctx);
    if (!group.gameSystem.settings.enabled) {
      await ctx.reply('⛔ ألعاب الجروب معطلة. فعّلها عبر /ggame on');
      return { ok: false, group };
    }
    const chatKey = String(ctx.chat.id);
    const hasActiveQuizPoll = Array.from(this.activeQuizPolls.values()).some((p) => p.chatId === chatKey);
    if (hasActiveQuizPoll) {
      await ctx.reply('⏳ يوجد سؤال Quiz نشط الآن. انتظر حتى ينتهي.');
      return { ok: false, group };
    }
    if (this.activeQuizSeries.has(chatKey)) {
      await ctx.reply('⏳ يوجد سلسلة QuizBot نشطة حاليًا.');
      return { ok: false, group };
    }
    if (this.activeRounds.has(String(ctx.chat.id))) {
      await ctx.reply('⏳ يوجد تحدي نشط الآن. جاوبوا أولاً قبل بدء لعبة جديدة.');
      return { ok: false, group };
    }
    return { ok: true, group };
  }

  static async handleGameToggleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');
    const args = this.parseCommandArgs(ctx);

    const group = await this.ensureGroupRecord(ctx);

    if (args.length === 0) {
      const s = group.gameSystem.settings;
      return ctx.reply(
        '🎮 <b>إعدادات ألعاب الجروب</b>\n\n' +
        `الحالة: ${s.enabled ? '✅ مفعلة' : '❌ معطلة'}\n` +
        `الأسئلة التلقائية: ${s.autoQuestions ? '✅' : '❌'}\n` +
        `كل: ${s.intervalMinutes} دقيقة\n` +
        `مهلة السؤال: ${s.questionTimeoutSec} ثانية\n\n` +
        'الاستخدام:\n<code>/ggame on</code>\n<code>/ggame off</code>\n<code>/ggame auto on 15</code>\n<code>/ggame auto off</code>',
        { parse_mode: 'HTML' }
      );
    }

    const mode = String(args[0]).toLowerCase();
    if (mode === 'on') {
      group.gameSystem.settings.enabled = true;
      await group.save();
      return ctx.reply('✅ تم تفعيل ألعاب الجروب.');
    }
    if (mode === 'off') {
      group.gameSystem.settings.enabled = false;
      this.clearRound(ctx.chat.id);
      await group.save();
      return ctx.reply('✅ تم تعطيل ألعاب الجروب.');
    }
    if (mode === 'auto') {
      const action = String(args[1] || '').toLowerCase();
      if (action === 'on') {
        const mins = Math.max(5, parseInt(args[2] || '15', 10) || 15);
        group.gameSystem.settings.autoQuestions = true;
        group.gameSystem.settings.intervalMinutes = mins;
        await group.save();
        return ctx.reply(`✅ تم تفعيل الأسئلة التلقائية كل ${mins} دقيقة.`);
      }
      if (action === 'off') {
        group.gameSystem.settings.autoQuestions = false;
        await group.save();
        return ctx.reply('✅ تم إيقاف الأسئلة التلقائية.');
      }
    }

    return ctx.reply('❌ صيغة غير صحيحة. استخدم /ggame أو /ggame auto on 15');
  }

  static async handleQuizCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const args = this.parseCommandArgs(ctx);
    const opts = this.parseQuizOptions(args, status.group.gameSystem.settings.questionTimeoutSec || 25);
    const pool = ALL_MCQ_QUESTIONS.filter((q) => this.questionMatchesDifficulty(q, opts.difficulty))
      .filter((q) => this.questionMatchesCategory(q, opts.category));
    const source = pool.length > 0 ? pool : ALL_MCQ_QUESTIONS;
    const question = this.pickNonRepeating(source, `quizpoll:${String(ctx.chat.id)}:${opts.difficulty || 'all'}:${opts.category || 'all'}`);
    const timeoutSec = Math.max(10, opts.timeoutSec || 25);
    await this.sendQuizPoll(ctx.chat.id, question, question.reward, timeoutSec);
  }

  static async handleMathCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const round = this.buildMathRound();
    round.timeoutSec = Math.max(10, status.group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleWordCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const round = this.buildWordRound();
    round.timeoutSec = Math.max(10, status.group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleWhoAmICommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const round = this.buildWhoAmIRound();
    round.timeoutSec = Math.max(12, status.group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleRiddleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const round = this.buildRiddleRound();
    round.timeoutSec = Math.max(12, status.group.gameSystem.settings.questionTimeoutSec || 25);
    await this.startRoundInternal(ctx.chat.id, round, false);
  }

  static async handleTypingCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    await this.startRoundInternal(ctx.chat.id, this.buildTypingRound(), false);
  }

  static async handleDailyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const group = status.group;
    const todayKey = this.getDateKey();
    if (group.gameSystem.state.lastDailyKey === todayKey) return ctx.reply('✅ تم لعب التحدي اليومي اليوم بالفعل. جرّب غدًا.');
    group.gameSystem.state.lastDailyKey = todayKey;
    await group.save();
    await this.startRoundInternal(ctx.chat.id, this.buildDailyRound(), false);
  }
  static async handleMcqCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;
    const args = this.parseCommandArgs(ctx);
    const opts = this.parseQuizOptions(args, status.group.gameSystem.settings.questionTimeoutSec || 25);
    const pool = ALL_MCQ_QUESTIONS.filter((q) => this.questionMatchesDifficulty(q, opts.difficulty))
      .filter((q) => this.questionMatchesCategory(q, opts.category));
    const source = pool.length > 0 ? pool : ALL_MCQ_QUESTIONS;
    const question = this.pickNonRepeating(source, `mcq:${String(ctx.chat.id)}:${opts.difficulty || 'all'}:${opts.category || 'all'}`);
    const timeoutSec = Math.max(10, opts.timeoutSec || 25);
    await this.sendQuizPoll(ctx.chat.id, question, question.reward, timeoutSec);
  }

  static async dispatchQuizSeries(chatId) {
    const session = this.activeQuizSeries.get(String(chatId));
    if (!session) return;
    if (session.remaining <= 0) {
      this.activeQuizSeries.delete(String(chatId));
      await this.bot.telegram.sendMessage(Number(chatId), '🏁 انتهت سلسلة الكويز. استخدم /gleader لعرض النتائج.').catch(() => {});
      return;
    }

    const pool = ALL_MCQ_QUESTIONS.filter((q) => this.questionMatchesDifficulty(q, session.difficulty))
      .filter((q) => this.questionMatchesCategory(q, session.category));
    const source = pool.length > 0 ? pool : ALL_MCQ_QUESTIONS;
    const question = this.pickNonRepeating(source, `series:${String(chatId)}:${session.difficulty || 'all'}:${session.category || 'all'}`);
    await this.sendQuizPoll(chatId, question, question.reward, session.timeoutSec);
    session.remaining -= 1;

    if (session.remaining > 0) {
      session.timer = setTimeout(() => {
        this.dispatchQuizSeries(chatId).catch(() => {});
      }, (session.timeoutSec + 3) * 1000);
    } else {
      session.timer = setTimeout(async () => {
        this.activeQuizSeries.delete(String(chatId));
        await this.bot.telegram.sendMessage(Number(chatId), '🏁 انتهت سلسلة الكويز. استخدم /gleader لعرض النتائج.').catch(() => {});
      }, (session.timeoutSec + 3) * 1000);
    }
  }

  static async handleQuizSetCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const args = this.parseCommandArgs(ctx);
    const chatKey = String(ctx.chat.id);

    if (args.length === 0) {
      const active = this.activeQuizSeries.get(chatKey);
      if (!active) {
        return ctx.reply(
          '🧩 <b>نظام QuizBot للجروب</b>\n\n' +
          'لبدء سلسلة: <code>/gquizset 5</code>\n' +
          'مع صعوبة: <code>/gquizset 7 hard</code>\n' +
          'للإيقاف: <code>/gquizset stop</code>',
          { parse_mode: 'HTML' }
        );
      }
      return ctx.reply(`⏳ سلسلة نشطة: متبقي ${active.remaining} سؤال.`);
    }

    const mode = String(args[0]).toLowerCase();
    if (['stop', 'off', 'cancel'].includes(mode)) {
      const current = this.activeQuizSeries.get(chatKey);
      if (current?.timer) clearTimeout(current.timer);
      this.activeQuizSeries.delete(chatKey);
      return ctx.reply('✅ تم إيقاف سلسلة الكويز.');
    }

    if (this.activeQuizSeries.has(chatKey)) {
      return ctx.reply('⏳ يوجد سلسلة كويز نشطة بالفعل. استخدم /gquizset stop لإيقافها أولاً.');
    }

    const count = Math.max(2, Math.min(20, parseInt(args[0] || '5', 10) || 5));
    const quizOpts = this.parseQuizOptions(args.slice(1), 25);
    const group = await this.ensureGroupRecord(ctx);
    const timeoutSec = Math.max(10, quizOpts.timeoutSec || group.gameSystem.settings.questionTimeoutSec || 25);

    this.activeQuizSeries.set(chatKey, {
      remaining: count,
      difficulty: quizOpts.difficulty,
      category: quizOpts.category,
      timeoutSec,
      timer: null
    });

    await ctx.reply(`🚀 بدأت سلسلة QuizBot: ${count} أسئلة${quizOpts.category ? ` | نوع: ${quizOpts.category}` : ''}${quizOpts.difficulty ? ` | صعوبة: ${quizOpts.difficulty}` : ''}${timeoutSec ? ` | وقت: ${timeoutSec}ث` : ''}.`);
    await this.dispatchQuizSeries(ctx.chat.id);
  }

  static async handleMcqCallback(ctx, token, index) {
    if (!this.isGroupChat(ctx)) return;
    const state = this.activeMcq.get(token);
    if (!state) return ctx.answerCbQuery('انتهت هذه الجولة.', { show_alert: false }).catch(() => {});
    if (String(ctx.chat.id) !== String(state.chatId)) return ctx.answerCbQuery('هذه الجولة ليست لهذا الجروب.', { show_alert: false }).catch(() => {});

    const selected = Number(index);
    if (selected !== Number(state.answerIndex)) return ctx.answerCbQuery('إجابة غير صحيحة، جرّب مرة أخرى.', { show_alert: false }).catch(() => {});

    clearTimeout(state.timer);
    this.activeMcq.delete(token);
    await ctx.answerCbQuery('إجابة صحيحة!', { show_alert: false }).catch(() => {});

    const group = await this.ensureGroupRecord(ctx);
    const scoreMeta = await this.updateScore(group, ctx.from, state.reward);
    group.updatedAt = new Date();
    await group.save();

    const rank = this.getUserRank(group, ctx.from.id);
    const boostLine = scoreMeta.boostActive ? '\n🚀 معزز الدولار مفعل' : '';
    const tierLine = scoreMeta.tier ? `\n🏅 المستوى: ${scoreMeta.tier}` : '';
    const tierBonusLine = scoreMeta.tierUpBonus > 0 ? `\n🎉 مكافأة ترقية +${scoreMeta.tierUpBonus}` : '';
    const winnerMention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');
    await ctx.reply(`✅ ${winnerMention} أجاب صحيحًا!\n💰 +${this.formatCurrency(scoreMeta.finalReward)}${boostLine}${tierBonusLine}${tierLine}\n🏅 ترتيبك: #${rank || '-'}`, { parse_mode: 'HTML' });
  }

  static parseVoteCommand(text) {
    if (!text.includes('|')) return null;
    const parts = text.split('|').map((x) => x.trim()).filter(Boolean);
    if (parts.length < 3) return null;
    const head = parts[0].replace(/^\/gvote\s*/i, '').trim();
    const sec = parseInt(head, 10);
    const hasDuration = Number.isInteger(sec) && sec >= 20 && sec <= 600;
    const durationSec = hasDuration ? sec : 90;
    const question = hasDuration ? parts[1] : head;
    const optionStart = hasDuration ? 2 : 1;
    const options = parts.slice(optionStart, optionStart + 5);
    if (!question || options.length < 2) return null;
    return { question, options, durationSec };
  }

  static buildVoteKeyboard(session) {
    const rows = session.options.map((opt, idx) => [Markup.button.callback(`${opt} (${session.counts[idx] || 0})`, `group:vote:${session.token}:${idx}`)]);
    return Markup.inlineKeyboard(rows);
  }

  static async handleVoteCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const argsRaw = (ctx.message?.text || '').trim();
    let payload = this.parseVoteCommand(argsRaw);
    if (!payload) {
      const base = this.pickRandom(DEFAULT_VOTE_TOPICS);
      payload = { ...base, durationSec: 90 };
    }
    payload.options = this.shuffleArray(payload.options);

    // Prefer native Telegram poll so options always render on all clients.
    try {
      const pollQuestion = String(payload.question || '').trim().slice(0, 300);
      const pollOptions = payload.options
        .map((opt) => String(opt || '').trim().slice(0, 100))
        .filter(Boolean)
        .slice(0, 10);

      if (pollQuestion && pollOptions.length >= 2) {
        const openPeriod = Math.min(600, Math.max(20, Number(payload.durationSec || 90)));
        await ctx.telegram.sendPoll(ctx.chat.id, pollQuestion, pollOptions, {
          is_anonymous: false,
          allows_multiple_answers: false,
          open_period: openPeriod,
          reply_to_message_id: ctx.callbackQuery?.message?.message_id || undefined
        });
        return;
      }
    } catch (_pollError) {
      // Fall back to inline vote below.
    }

    const oldToken = this.activeVoteByChat.get(String(ctx.chat.id));
    if (oldToken) {
      const oldSession = this.activeVotes.get(oldToken);
      if (oldSession?.timer) clearTimeout(oldSession.timer);
      this.activeVotes.delete(oldToken);
    }

    const token = this.token('v');
    const session = {
      token,
      chatId: String(ctx.chat.id),
      question: payload.question,
      options: payload.options,
      votes: {},
      counts: Array(payload.options.length).fill(0),
      durationSec: payload.durationSec || 90,
      messageId: null,
      timer: null
    };

    this.activeVotes.set(token, session);
    this.activeVoteByChat.set(String(ctx.chat.id), token);

    const keyboard = this.buildVoteKeyboard(session);
    let sent = null;
    try {
      sent = await ctx.reply(`🗳️ <b>${session.question}</b>\n\n⏱️ مدة التصويت: ${session.durationSec} ثانية\nصيغة مخصصة: /gvote 120 | السؤال | خيار1 | خيار2 | خيار3`, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
      });
    } catch (_e) {
      // Fallback in case Telegram rejects markup for any reason.
      const choices = session.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
      sent = await ctx.reply(`🗳️ ${session.question}\n\n${choices}\n\n⚠️ لم يتم عرض الأزرار، جرّب إصدار Telegram مختلف.`);
    }
    session.messageId = sent.message_id;
    session.timer = setTimeout(async () => {
      await this.finalizeVote(session.token);
    }, session.durationSec * 1000);
  }

  static async finalizeVote(token) {
    const session = this.activeVotes.get(token);
    if (!session) return;
    this.activeVotes.delete(token);
    if (this.activeVoteByChat.get(String(session.chatId)) === token) {
      this.activeVoteByChat.delete(String(session.chatId));
    }
    if (session.timer) clearTimeout(session.timer);

    const result = session.options.map((opt, idx) => ({ opt, count: session.counts[idx] || 0 }))
      .sort((a, b) => b.count - a.count);
    const winner = result[0];
    let message = `🧾 <b>انتهى التصويت</b>\n\nالسؤال: ${session.question}\n`;
    if (!winner || winner.count === 0) {
      message += '\nلا توجد أصوات مسجلة.';
    } else {
      message += `\n🏆 الخيار الفائز: <b>${winner.opt}</b> (${winner.count} صوت)\n\n`;
      result.forEach((r, i) => {
        message += `${i + 1}. ${r.opt} — ${r.count}\n`;
      });
    }

    await this.bot.telegram.sendMessage(Number(session.chatId), message, {
      parse_mode: 'HTML',
      reply_to_message_id: session.messageId || undefined
    }).catch(() => {});
  }

  static async handleVoteCallback(ctx, token, index) {
    if (!this.isGroupChat(ctx)) return;
    const session = this.activeVotes.get(token);
    if (!session) return ctx.answerCbQuery('هذا التصويت انتهى.', { show_alert: false }).catch(() => {});
    if (String(ctx.chat.id) !== String(session.chatId)) return ctx.answerCbQuery('تصويت لجروب آخر.', { show_alert: false }).catch(() => {});

    const idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= session.options.length) {
      return ctx.answerCbQuery('خيار غير صالح.', { show_alert: false }).catch(() => {});
    }

    const userId = String(ctx.from.id);
    const prev = session.votes[userId];
    if (Number.isInteger(prev)) session.counts[prev] = Math.max(0, (session.counts[prev] || 0) - 1);
    session.votes[userId] = idx;
    session.counts[idx] = (session.counts[idx] || 0) + 1;

    await ctx.answerCbQuery('تم تسجيل صوتك ✅', { show_alert: false }).catch(() => {});
    await ctx.editMessageReplyMarkup(this.buildVoteKeyboard(session).reply_markup).catch(() => {});
  }

  static async handleLeaderCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const rows = [...group.gameSystem.scores].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
    if (rows.length === 0) return ctx.reply('📊 لا يوجد دولار بعد. ابدأوا عبر /gquiz');

    let text = '🏁 <b>متصدرين الجروب (إجمالي)</b>\n\n';
    rows.forEach((r, i) => {
      const name = r.username || r.userId;
      const tier = r.tier || this.resolveTierFromXp(r.xp || 0).name;
      text += `${i + 1}. ${name} — ${this.formatCurrency(r.points || 0)} | ${tier} | 🔥 ${r.streak || 0}\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleWeeklyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const rows = [...group.gameSystem.scores].sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0)).slice(0, 10);
    if (rows.length === 0) return ctx.reply('📊 لا يوجد دولار أسبوعي بعد.');

    let text = '📅 <b>سباق الأسبوع</b>\n\n';
    rows.forEach((r, i) => {
      const name = r.username || r.userId;
      const tier = r.tier || this.resolveTierFromXp(r.xp || 0).name;
      text += `${i + 1}. ${name} — ${this.formatCurrency(r.weeklyPoints || 0)} | ${tier}\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleMonthlyBoardCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const rows = [...group.gameSystem.scores].sort((a, b) => (b.monthlyPoints || 0) - (a.monthlyPoints || 0)).slice(0, 10);
    if (rows.length === 0) return ctx.reply('📊 لا يوجد دولار شهري بعد.');
    let text = '🗓️ <b>سباق الشهر</b>\n\n';
    rows.forEach((r, i) => {
      const name = r.username || r.userId;
      const tier = r.tier || this.resolveTierFromXp(r.xp || 0).name;
      text += `${i + 1}. ${name} — ${this.formatCurrency(r.monthlyPoints || 0)} | ${tier}\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleTeamCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const args = this.parseCommandArgs(ctx);
    const userId = Number(ctx.from.id);

    if (args.length === 0) {
      return ctx.reply('👥 أوامر الفرق:\n/gteam create اسم_الفريق\n/gteam join اسم_الفريق\n/gteam leave\n/gteam info');
    }

    const mode = String(args[0]).toLowerCase();
    if (mode === 'create') {
      const name = args.slice(1).join(' ').trim().replace(/\s+/g, ' ').slice(0, 24);
      if (!name) return ctx.reply('❌ اكتب اسم فريق. مثال: /gteam create الصقور');
      if (this.getUserTeam(group, userId)) return ctx.reply('❌ أنت ضمن فريق بالفعل. استخدم /gteam leave أولاً.');
      if (this.findTeamByName(group, name)) return ctx.reply('❌ هذا الاسم مستخدم بالفعل.');

      group.gameSystem.teams.push({ name, captainId: userId, members: [userId], points: 0, wins: 0, createdAt: new Date(), updatedAt: new Date() });
      await group.save();
      return ctx.reply(`✅ تم إنشاء فريق: ${name}`);
    }

    if (mode === 'join') {
      const name = args.slice(1).join(' ').trim().replace(/\s+/g, ' ');
      if (!name) return ctx.reply('❌ اكتب اسم الفريق. مثال: /gteam join الصقور');
      if (this.getUserTeam(group, userId)) return ctx.reply('❌ أنت ضمن فريق بالفعل. استخدم /gteam leave أولاً.');

      const team = this.findTeamByName(group, name);
      if (!team) return ctx.reply('❌ الفريق غير موجود.');
      team.members = Array.isArray(team.members) ? team.members : [];
      if (!team.members.includes(userId)) team.members.push(userId);
      team.updatedAt = new Date();
      await group.save();
      return ctx.reply(`✅ انضممت إلى فريق ${team.name}`);
    }

    if (mode === 'leave') {
      const team = this.getUserTeam(group, userId);
      if (!team) return ctx.reply('ℹ️ أنت لست ضمن أي فريق.');

      team.members = (team.members || []).filter((id) => Number(id) !== userId);
      if (Number(team.captainId) === userId && team.members.length > 0) team.captainId = Number(team.members[0]);
      if (team.members.length === 0) group.gameSystem.teams = group.gameSystem.teams.filter((t) => this.normalizeText(t.name) !== this.normalizeText(team.name));
      await group.save();
      return ctx.reply('✅ تم خروجك من الفريق.');
    }

    if (mode === 'info') {
      const team = this.getUserTeam(group, userId);
      if (!team) return ctx.reply('ℹ️ أنت لست ضمن أي فريق.');
      return ctx.reply(`👥 <b>${team.name}</b>\n🧑‍✈️ القائد: <code>${team.captainId}</code>\n👤 الأعضاء: ${team.members.length}\n🏅 رصيد الفريق: ${this.formatCurrency(team.points || 0)}\n🏆 مرات الفوز: ${team.wins || 0}`, { parse_mode: 'HTML' });
    }

    return ctx.reply('❌ صيغة غير صحيحة. استخدم /gteam');
  }

  static async handleTeamsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const teams = [...(group.gameSystem.teams || [])].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
    if (teams.length === 0) return ctx.reply('📊 لا توجد فرق بعد. ابدأ عبر /gteam create');

    let text = '🏟️ <b>ترتيب الفرق</b>\n\n';
    teams.forEach((t, i) => {
      text += `${i + 1}. ${t.name} — ${this.formatCurrency(t.points || 0)} | أعضاء: ${(t.members || []).length}\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleTournamentCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const args = this.parseCommandArgs(ctx);
    const t = group.gameSystem.tournament;

    if (args.length === 0 || String(args[0]).toLowerCase() === 'status') {
      const top = [...(group.gameSystem.teams || [])].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 3);
      let text = '🏆 <b>حالة البطولة الأسبوعية</b>\n\n' + `الحالة: ${t.active ? '✅ نشطة' : '❌ متوقفة'}\n` + `الموسم: ${t.season}\n` + `الجوائز: ${t.rewards.first}/${t.rewards.second}/${t.rewards.third}\n\n` + '<b>المراكز الحالية:</b>\n';
      if (top.length === 0) text += 'لا توجد فرق بعد.';
      else top.forEach((team, i) => { text += `${i + 1}. ${team.name} — ${team.points || 0}\n`; });
      return ctx.reply(text, { parse_mode: 'HTML' });
    }

    const mode = String(args[0]).toLowerCase();
    if (mode === 'start') {
      group.gameSystem.teams.forEach((team) => { team.points = 0; team.updatedAt = new Date(); });
      t.active = true;
      t.startedAt = new Date();
      t.endedAt = null;
      await group.save();
      return ctx.reply(`✅ تم بدء البطولة (الموسم ${t.season}). تم تصفير رصيد الفرق.`);
    }

    if (mode === 'rewards') {
      const first = parseInt(args[1] || '', 10);
      const second = parseInt(args[2] || '', 10);
      const third = parseInt(args[3] || '', 10);
      if (!Number.isInteger(first) || !Number.isInteger(second) || !Number.isInteger(third)) return ctx.reply('❌ استخدم: /gtour rewards 100 60 40');
      if (first <= 0 || second <= 0 || third <= 0 || !(first >= second && second >= third)) return ctx.reply('❌ القيم غير منطقية. يجب أن تكون first >= second >= third');
      t.rewards = { first, second, third };
      await group.save();
      return ctx.reply(`✅ تم تحديث الجوائز إلى: ${first}/${second}/${third}`);
    }

    if (mode === 'end' || mode === 'stop') {
      if (!t.active) return ctx.reply('ℹ️ لا توجد بطولة نشطة حالياً.');

      const top = [...(group.gameSystem.teams || [])].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 3);
      const rewards = [t.rewards.first, t.rewards.second, t.rewards.third];
      for (const [idx, team] of top.entries()) {
        const bonus = rewards[idx] || 0;
        team.wins = (team.wins || 0) + 1;
        await Promise.all((team.members || []).map((memberId) => this.addRewardPointsToMember(group, memberId, bonus)));
      }

      t.active = false;
      t.endedAt = new Date();
      t.season = (t.season || 1) + 1;
      await group.save();

      let text = '🏁 <b>انتهت البطولة</b>\n\n';
      if (top.length === 0) text += 'لا توجد فرق مشاركة.';
      else top.forEach((team, idx) => { text += `${idx + 1}. ${team.name} — ${this.formatCurrency(team.points || 0)} | جائزة لكل عضو: ${this.formatCurrency(rewards[idx] || 0)}\n`; });
      return ctx.reply(text, { parse_mode: 'HTML' });
    }

    return ctx.reply('❌ صيغة غير صحيحة. استخدم /gtour status|start|end|rewards');
  }

  static async handleChanceCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const currentUserRow = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(currentUserRow, ctx.from);
    await group.save();
    const pool = (group.gameSystem.scores || []).slice(0, 40);
    if (!pool.find((x) => Number(x.userId) === Number(ctx.from.id))) {
      pool.push({ userId: Number(ctx.from.id), username: ctx.from.username || ctx.from.first_name || String(ctx.from.id) });
    }
    const picked = this.pickRandom(pool);
    const challenge = this.pickRandom(CHANCE_CHALLENGES);
    return ctx.reply(
      `🎲 <b>روليت الأوامر</b>\n\n` +
      `👤 العضو المختار: <b>${picked.username || picked.userId}</b>\n` +
      `⚡ التحدي: ${challenge}\n\n` +
      'إذا نفّذ التحدي بنجاح، امنحوه دولار تشجيعي عبر /ggift rose بالرد عليه.',
      { parse_mode: 'HTML' }
    );
  }

  static async handleStoreCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    await group.save();
    const items = GROUP_STORE.map((x) => `• <code>${x.key}</code> → ${x.title} (${this.formatCurrency(x.price)})`).join('\n');
    return ctx.reply(
      `🛒 <b>متجر الجروب</b>\n\n` +
      `رصيدك: <b>${this.formatCurrency(row.points || 0)}</b>\n\n` +
      `${items}\n\n` +
      `للشراء: <code>/gbuy مفتاح_العنصر</code>`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleBuyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    const key = String(args[0] || '').toLowerCase();
    const normalizedInput = this.normalizeText(args.join(' '));
    const item = GROUP_STORE.find((x) => x.key === key)
      || GROUP_STORE.find((x) => this.normalizeText(x.title) === normalizedInput)
      || GROUP_STORE.find((x) => normalizedInput.length > 2 && this.normalizeText(x.title).includes(normalizedInput));
    if (!item) return ctx.reply('❌ عنصر غير موجود. استخدم /gstore');

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if ((row.points || 0) < item.price) return ctx.reply(`❌ رصيدك غير كافٍ. تحتاج ${this.formatCurrency(item.price)}.`);
    row.points -= item.price;
    if (item.type === 'title') {
      row.title = item.title;
      row.customTitle = true;
    } else if (item.type === 'boost') {
      const mins = Math.max(5, Number(item.minutes) || 30);
      row.activeBoost = {
        multiplier: Math.max(2, Number(item.multiplier) || 2),
        expiresAt: new Date(Date.now() + mins * 60 * 1000)
      };
    }
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    if (item.type === 'boost') {
      return ctx.reply(`✅ تم تفعيل ${item.title}.`);
    }
    return ctx.reply(`✅ تم شراء اللقب وتفعيله: ${item.title}`);
  }

  static async handleSimpleBuyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    if (args.length === 0) return this.handleStoreCommand(ctx);

    const first = this.normalizeText(String(args[0] || ''));
    if (first === 'موارد') return this.handleBuyResourcesCommand(ctx);
    if (first === 'جيش') return this.handleBuyArmyCommand(ctx);
    if (this.parseResourceKey(args[0]) && Number.isInteger(parseInt(args[1], 10))) return this.handleBuyResourcesCommand(ctx);

    const giftInput = this.extractGiftInputFromArgs(args);
    const gift = this.resolveGiftByInput(giftInput) || this.resolveGiftByInput(args[0]);
    if (gift) return this.handleBuyGiftForSelfCommand(ctx);
    return this.handleBuyCommand(ctx);
  }

  static async handleSimpleSellCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    if (args.length === 0) return ctx.reply('❌ اكتب اسم الهدية التي تريد بيعها.\nمثال: بيع قصر 1');

    const giftInput = this.extractGiftInputFromArgs(args);
    const gift = this.resolveGiftByInput(giftInput) || this.resolveGiftByInput(args[0]);
    if (!gift) return ctx.reply('❌ البيع هنا للهدايا فقط. اكتب: بيع [اسم الهدية]');
    return this.handleSellGiftCommand(ctx);
  }

  static async handleLoungeMenuCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.loungeState = this.normalizeLoungeState(row.loungeState || {});
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});
    const market = this.ensureCafeMarket(group);
    await group.save();

    const line = (k) => {
      const p = LOUNGE_PRODUCTS[k];
      const unit = this.getCafePrice(p, market);
      const stock = Number(market.stocks?.[p.key] || 0);
      return `• ${p.name} (${this.formatCurrency(unit)}) | المخزون: ${stock}`;
    };
    return ctx.reply(
      `🪩 <b>لاونج جو</b>\n\n` +
      `رصيدك: ${this.formatCurrency(row.points || 0)}\n\n` +
      `🥤 <b>المشروبات الباردة</b>\n${line('mojito')}\n${line('orange_juice')}\n${line('lemon_juice')}\n${line('fruit_juice')}\n${line('banana_juice')}\n${line('avocado_juice')}\n${line('strawberry_juice')}\n${line('mango_juice')}\n${line('seven_up')}\n${line('cola')}\n${line('mirinda')}\n${line('juice')}\n\n` +
      `☕ <b>المشروبات الساخنة</b>\n${line('tea')}\n${line('coffee')}\n${line('nescafe')}\n${line('cappuccino')}\n${line('chai_latte')}\n${line('hot_chocolate')}\n\n` +
      `🚬 <b>الدخان</b>\n${line('cigarette')}\n${line('cigar')}\n${line('vape')}\n${line('vape_liquid')}\n${line('lighter')}\n\n` +
      `🫧 <b>الأرجيلة</b>\n${line('hookah')}\n${line('hookah_head')}\n${line('coal')}\n${line('molasses_apple')}\n${line('molasses_mint')}\n\n` +
      `🎮 <b>جلسة الأصحاب</b>\n• افتح جلسة ارجيلة\n• انضم\n• نفس\n\n` +
      `الأوامر السهلة:\n` +
      `• كافيتيريا | قائمة الكافيتيريا\n` +
      `• شراء سيجارة 2\n` +
      `• شراء قهوة\n` +
      `• شراء قداحة\n` +
      `• اشتغل بالكافيتيريا\n` +
      `• طلب كافيتيريا\n` +
      `• سلم الطلب\n` +
      `• ولع سيجارة\n` +
      `• هف / هفف / هففف / هفففف / هففففف\n` +
      `• مزاجي | توب الكافيتيريا`,
      { parse_mode: 'HTML' }
    );
  }

  static parseLoungeBuy(text) {
    const match = /^شراء\s+(.+?)(?:\s+(\d+))?$/i.exec(String(text || '').trim());
    if (!match) return null;
    const rawName = String(match[1] || '').trim();
    const qty = Math.max(1, Math.min(50, parseInt(this.normalizeArabicDigits(match[2] || '1'), 10) || 1));
    const productKey = this.normalizeLoungeToken(rawName);
    if (!productKey) return null;
    return { productKey, qty };
  }

  static ensureCafeMarket(group) {
    const dayKey = this.getDateKey();
    if (!group.gameSystem.cafeMarket || typeof group.gameSystem.cafeMarket !== 'object') {
      group.gameSystem.cafeMarket = { dayKey: '', stocks: {}, sold: {} };
    }
    const market = group.gameSystem.cafeMarket;
    if (market.dayKey !== dayKey) {
      market.dayKey = dayKey;
      market.stocks = {};
      market.sold = {};
      Object.values(LOUNGE_PRODUCTS).forEach((p) => {
        if (!p.market) return;
        const base = Math.max(1, Number(p.baseStock || 30));
        const variance = Math.floor(base * 0.25);
        const stock = Math.max(1, base - variance + Math.floor(Math.random() * (variance * 2 + 1)));
        market.stocks[p.key] = stock;
        market.sold[p.key] = 0;
      });
    }
    return market;
  }

  static getCafePrice(product, market) {
    const base = Math.max(1, Number(product?.price || 1));
    if (!product?.market) return base;
    const baseStock = Math.max(1, Number(product.baseStock || 30));
    const stock = Math.max(0, Number(market?.stocks?.[product.key] || 0));
    const sold = Math.max(0, Number(market?.sold?.[product.key] || 0));
    const remainingRatio = Math.max(0, Math.min(1, stock / baseStock));
    const mult = 1 + ((1 - remainingRatio) * 0.6) + ((sold / Math.max(1, baseStock)) * 0.2);
    return Math.max(1, Math.floor(base * mult));
  }

  static resetCafeDailyAndWeekly(cafeProfile) {
    const p = this.normalizeCafeProfile(cafeProfile || {});
    const day = this.getDateKey();
    const week = this.getWeekKey();
    if (p.puffDayKey !== day) {
      p.puffDayKey = day;
      p.puffsToday = 0;
    }
    if (p.weeklyKey !== week) {
      p.weeklyKey = week;
      p.weeklyCafeEarnings = 0;
    }
    return p;
  }

  static async applyCafeWeeklyRewards(group) {
    const weekKey = this.getWeekKey();
    group.gameSystem.state = group.gameSystem.state || {};
    if (group.gameSystem.state.cafeRewardWeekKey === weekKey) return null;

    const rows = [...(group.gameSystem.scores || [])];
    rows.forEach((r) => { r.cafeProfile = this.resetCafeDailyAndWeekly(r.cafeProfile || {}); });
    rows.sort((a, b) => Number(b.cafeProfile?.weeklyCafeEarnings || 0) - Number(a.cafeProfile?.weeklyCafeEarnings || 0));
    const top = rows.slice(0, 3);
    if (top.length === 0) {
      group.gameSystem.state.cafeRewardWeekKey = weekKey;
      return null;
    }
    const rewards = [35, 20, 10];
    top.forEach((r, i) => {
      r.points = Number(r.points || 0) + Number(rewards[i] || 0);
      r.updatedAt = new Date();
    });
    group.gameSystem.state.cafeRewardWeekKey = weekKey;
    return { top, rewards };
  }

  static async handleLoungeBuyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const parsed = this.parseLoungeBuy(ctx.message?.text || '');
    if (!parsed) return false;

    const product = LOUNGE_PRODUCTS[parsed.productKey];
    if (!product) return false;

    const group = await this.ensureGroupRecord(ctx);
    const market = this.ensureCafeMarket(group);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.loungeState = this.normalizeLoungeState(row.loungeState || {});
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});

    const inStock = Number(market.stocks?.[product.key] || 0);
    if (product.market && inStock < parsed.qty) {
      return ctx.reply(`❌ المخزون الحالي ما بكفي.\n• المتاح: ${inStock}\n• المطلوب: ${parsed.qty}`);
    }
    const unitPrice = this.getCafePrice(product, market);
    const total = Number(unitPrice || 0) * parsed.qty;
    if (Number(row.points || 0) < total) {
      return ctx.reply(`❌ فلوسك غير كافية.\n• المطلوب: ${this.formatCurrency(total)}\n• فلوسك: ${this.formatCurrency(row.points || 0)}`);
    }

    row.points = Number(row.points || 0) - total;
    row.loungeInventory[product.key] = Number(row.loungeInventory[product.key] || 0) + parsed.qty;
    if (product.market) {
      market.stocks[product.key] = Math.max(0, Number(market.stocks[product.key] || 0) - parsed.qty);
      market.sold[product.key] = Number(market.sold[product.key] || 0) + parsed.qty;
    }
    if (product.key === 'lighter') {
      const fuelAdd = parsed.qty * Number(product.ignitionsPerUnit || 25);
      row.loungeInventory.lighterFuel = Number(row.loungeInventory.lighterFuel || 0) + fuelAdd;
    }
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    const extra = product.key === 'lighter'
      ? `\n• توليعات القداحة المتاحة: ${row.loungeInventory.lighterFuel}`
      : '';
    return ctx.reply(
      `✅ تم شراء ${parsed.qty} ${product.name}\n` +
      `• سعر القطعة: ${this.formatCurrency(unitPrice)}\n` +
      `• التكلفة: ${this.formatCurrency(total)}\n` +
      `• الرصيد الآن: ${this.formatCurrency(row.points || 0)}${extra}`
    );
  }

  static parseLoungeSell(text) {
    const match = /^بيع\s+(.+?)(?:\s+(\d+))?$/i.exec(String(text || '').trim());
    if (!match) return null;
    const rawName = String(match[1] || '').trim();
    const qty = Math.max(1, Math.min(50, parseInt(this.normalizeArabicDigits(match[2] || '1'), 10) || 1));
    const productKey = this.normalizeLoungeToken(rawName);
    if (!productKey) return null;
    return { productKey, qty };
  }

  static async handleLoungeSellCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const parsed = this.parseLoungeSell(ctx.message?.text || '');
    if (!parsed) return false;
    const product = LOUNGE_PRODUCTS[parsed.productKey];
    if (!product) return false;

    const group = await this.ensureGroupRecord(ctx);
    const market = this.ensureCafeMarket(group);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    const own = Number(row.loungeInventory[product.key] || 0);
    if (own < parsed.qty) {
      return ctx.reply(`❌ ما عندك الكمية المطلوبة للبيع.\n• الموجود: ${own}`);
    }

    const unitPrice = this.getCafePrice(product, market);
    const sellUnit = Math.max(1, Math.floor(unitPrice * 0.7));
    const payout = sellUnit * parsed.qty;
    row.loungeInventory[product.key] = own - parsed.qty;
    row.points = Number(row.points || 0) + payout;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(
      `✅ تم بيع ${parsed.qty} ${product.name}\n` +
      `• سعر البيع للقطعة: ${this.formatCurrency(sellUnit)}\n` +
      `• المبلغ المستلم: ${this.formatCurrency(payout)}\n` +
      `• فلوسك الآن: ${this.formatCurrency(row.points || 0)}`
    );
  }

  static parseIgniteProduct(text) {
    const normalized = this.normalizeText(String(text || ''));
    for (const product of Object.values(LOUNGE_PRODUCTS)) {
      if (!Array.isArray(product.igniteAliases)) continue;
      if (product.igniteAliases.some((a) => this.normalizeText(a) === normalized)) {
        return product.key;
      }
    }
    return null;
  }

  static async handleLoungeIgniteCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const productKey = this.parseIgniteProduct(ctx.message?.text || '');
    if (!productKey) return false;
    const product = LOUNGE_PRODUCTS[productKey];
    if (!product) return false;

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.loungeState = this.normalizeLoungeState(row.loungeState || {});

    if (Number(row.loungeInventory[productKey] || 0) <= 0) {
      return ctx.reply(`❌ ما عندك ${product.name}. اكتب: شراء ${product.aliases[0]}`);
    }

    if (productKey === 'hookah') {
      if (Number(row.loungeInventory.hookah_head || 0) <= 0) {
        return ctx.reply('❌ الأرجيلة بدون راس. اشتري: راس أرجيلة');
      }
      if (Number(row.loungeInventory.coal || 0) <= 0) {
        return ctx.reply('❌ ما في فحم. اشتري: فحم');
      }
      const apple = Number(row.loungeInventory.molasses_apple || 0);
      const mint = Number(row.loungeInventory.molasses_mint || 0);
      if (apple <= 0 && mint <= 0) {
        return ctx.reply('❌ ناقص معسل. اشتري: معسل تفاح أو معسل نعناع');
      }
      row.loungeInventory.hookah_head = Math.max(0, Number(row.loungeInventory.hookah_head || 0) - 1);
      row.loungeInventory.coal = Math.max(0, Number(row.loungeInventory.coal || 0) - 1);
      if (apple > 0) row.loungeInventory.molasses_apple = apple - 1;
      else row.loungeInventory.molasses_mint = Math.max(0, mint - 1);
    }

    if (productKey === 'vape') {
      if (Number(row.loungeInventory.vape_liquid || 0) <= 0) {
        return ctx.reply('❌ جهاز الفيب موجود، بس بدون سائل. اشتري: سائل فيب');
      }
      row.loungeInventory.vape_liquid = Math.max(0, Number(row.loungeInventory.vape_liquid || 0) - 1);
    }

    if (product.needsLighter) {
      const fuel = Number(row.loungeInventory.lighterFuel || 0);
      if (fuel <= 0) {
        return ctx.reply('❌ السيجارة موجودة بس ما معك قداحة/غاز كفاية... اشتري قداحة أول.');
      }
      row.loungeInventory.lighterFuel = fuel - 1;
    }

    if (productKey === 'cigarette' || productKey === 'cigar') {
      row.loungeInventory[productKey] = Number(row.loungeInventory[productKey] || 0) - 1;
    }
    row.loungeState = {
      active: true,
      productKey,
      productName: product.name,
      puffsLeft: Number(product.puffs || 5),
      totalPuffs: Number(product.puffs || 5),
      startedAt: new Date()
    };
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    const lighterLine = product.needsLighter
      ? `\n• توليعات القداحة المتبقية: ${row.loungeInventory.lighterFuel}`
      : '';
    return ctx.reply(
      `🔥 تم تجهيز ${product.name}\n` +
      `• النفخات المتاحة: ${row.loungeState.puffsLeft}/${row.loungeState.totalPuffs}${lighterLine}\n` +
      '• الآن استخدم: هف أو هفف أو هففف...'
    );
  }

  static isPuffAlias(text) {
    const t = String(text || '').trim();
    return LOUNGE_PUFF_ALIASES.some((pattern) => pattern.test(t));
  }

  static async handleLoungePuffCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const text = String(ctx.message?.text || '').trim();
    if (!this.isPuffAlias(text)) return false;

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.loungeState = this.normalizeLoungeState(row.loungeState || {});
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});

    if (!row.loungeState.active || !row.loungeState.productKey) {
      return ctx.reply('❌ ما في شي مولّع عندك الآن. اكتب: ولع سيجارة أو جهز ارجيلة أو شغل فيب.');
    }
    const idleMs = row.loungeState.startedAt ? (Date.now() - new Date(row.loungeState.startedAt).getTime()) : 0;
    if (idleMs > (2 * 60 * 1000)) {
      row.loungeState = this.defaultLoungeState();
      await group.save();
      await this.syncRowToGlobal(userDoc, row);
      return ctx.reply('💨 المنتج طفى لحاله من طول الغيبة... ولّعه من جديد.');
    }

    if (this.checkCooldown(ctx, 'lounge:puff', 1000 * 20)) {
      return ctx.reply('⏳ تمهّل شوي قبل النفس اللي بعده.');
    }
    if ((row.cafeProfile.puffsToday || 0) >= LOUNGE_DAILY_PUFF_LIMIT) {
      return ctx.reply(`🧾 وصلت الحد اليومي للنفخات (${LOUNGE_DAILY_PUFF_LIMIT})`);
    }
    const puffCost = 1;
    if (Number(row.points || 0) < puffCost) {
      return ctx.reply('❌ لازم يكون معك على الأقل 1 دولار لكل نفس.');
    }

    row.loungeState.puffsLeft = Math.max(0, Number(row.loungeState.puffsLeft || 0) - 1);
    row.loungeState.startedAt = new Date();
    const reward = 1 + Math.floor(Math.random() * 2);
    row.points = Math.max(0, Number(row.points || 0) - puffCost) + reward;
    row.cafeProfile.puffsToday = Number(row.cafeProfile.puffsToday || 0) + 1;
    row.cafeProfile.loungePuffs = Number(row.cafeProfile.loungePuffs || 0) + 1;
    row.cafeProfile.mood = Math.min(100, Number(row.cafeProfile.mood || 0) + 1);
    row.cafeProfile.moodUntil = new Date(Date.now() + 15 * 60 * 1000);
    if (row.loungeState.productKey === 'hookah') row.cafeProfile.hookahPuffs = Number(row.cafeProfile.hookahPuffs || 0) + 1;
    else row.cafeProfile.smokePuffs = Number(row.cafeProfile.smokePuffs || 0) + 1;
    row.updatedAt = new Date();

    let message = `${this.pickRandom(LOUNGE_PUFF_LINES)}\n` +
      `• ${row.loungeState.productName}: ${row.loungeState.puffsLeft}/${row.loungeState.totalPuffs}\n` +
      `• الصافي: +${this.formatCurrency(Math.max(0, reward - puffCost))}\n` +
      `• المزاج: ${row.cafeProfile.mood}/100`;

    if (row.loungeState.puffsLeft <= 0) {
      message += `\n\n${this.pickLoungeFinishLine(row.loungeState.productKey)}`;
      row.loungeState = this.defaultLoungeState();
    }

    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(message);
  }

  static async handleLoungeSuppliesCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.loungeState = this.normalizeLoungeState(row.loungeState || {});
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});
    await group.save();

    const sessionLine = row.loungeState.active
      ? `✅ نشط: ${row.loungeState.productName} (${row.loungeState.puffsLeft}/${row.loungeState.totalPuffs})`
      : '❌ ما في جلسة تدخين نشطة.';
    return ctx.reply(
      `🧰 <b>مستلزماتك</b>\n\n` +
      `• سيجارة: ${row.loungeInventory.cigarette || 0}\n` +
      `• سيجار: ${row.loungeInventory.cigar || 0}\n` +
      `• فيب: ${row.loungeInventory.vape || 0}\n` +
      `• أرجيلة: ${row.loungeInventory.hookah || 0}\n` +
      `• راس أرجيلة: ${row.loungeInventory.hookah_head || 0}\n` +
      `• فحم: ${row.loungeInventory.coal || 0}\n` +
      `• معسل تفاح: ${row.loungeInventory.molasses_apple || 0}\n` +
      `• معسل نعناع: ${row.loungeInventory.molasses_mint || 0}\n` +
      `• قداحة: ${row.loungeInventory.lighter || 0}\n` +
      `• توليعات متبقية: ${row.loungeInventory.lighterFuel || 0}\n\n` +
      `• الحالة: ${sessionLine}\n` +
      `• مزاجك: ${row.cafeProfile.mood || 0}/100\n` +
      `• نفخات اليوم: ${row.cafeProfile.puffsToday || 0}/${LOUNGE_DAILY_PUFF_LIMIT}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleCafeWorkCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});
    const last = row.cafeProfile.workLastAt ? new Date(row.cafeProfile.workLastAt).getTime() : 0;
    const left = CAFE_WORK_COOLDOWN_MS - (Date.now() - last);
    if (left > 0) {
      return ctx.reply(`⏳ تقدر تشتغل بعد ${Math.ceil(left / 60000)} دقيقة.`);
    }
    const salary = 7 + Math.floor(Math.random() * 12);
    const gotTip = Math.random() < 0.35;
    const tip = gotTip ? (2 + Math.floor(Math.random() * 7)) : 0;
    const total = salary + tip;
    row.points = Number(row.points || 0) + total;
    row.cafeProfile.workLastAt = new Date();
    row.cafeProfile.reputation = Number(row.cafeProfile.reputation || 0) + 1;
    row.cafeProfile.ordersCompleted = Number(row.cafeProfile.ordersCompleted || 0) + 1;
    row.cafeProfile.cafeEarnings = Number(row.cafeProfile.cafeEarnings || 0) + total;
    row.cafeProfile.weeklyCafeEarnings = Number(row.cafeProfile.weeklyCafeEarnings || 0) + total;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(
      `👨‍🍳 اشتغلت بالكافيتيريا بنجاح!\n` +
      `• الأجر: ${this.formatCurrency(salary)}\n` +
      `${gotTip ? `• بقشيش: ${this.formatCurrency(tip)}\n` : ''}` +
      `• إجمالي الربح: ${this.formatCurrency(total)}\n` +
      `• السمعة: ${row.cafeProfile.reputation}`
    );
  }

  static async handleCafeRequestCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const market = this.ensureCafeMarket(group);
    const existing = this.activeCafeRequests.get(String(ctx.chat.id));
    if (existing && Date.now() < Number(existing.endsAt || 0)) {
      return ctx.reply(`⏳ فيه طلب شغال بالفعل: ${existing.qty} ${LOUNGE_PRODUCTS[existing.itemKey]?.name || existing.itemKey}`);
    }
    const keys = ['coffee', 'tea', 'juice', 'mojito', 'orange_juice', 'lemon_juice', 'fruit_juice', 'banana_juice', 'avocado_juice', 'strawberry_juice', 'mango_juice', 'seven_up', 'cola', 'mirinda', 'nescafe', 'cappuccino', 'chai_latte', 'hot_chocolate'];
    const itemKey = this.pickRandom(keys);
    const qty = 1 + Math.floor(Math.random() * 3);
    const reward = (this.getCafePrice(LOUNGE_PRODUCTS[itemKey], market) * qty) + 6;
    this.activeCafeRequests.set(String(ctx.chat.id), {
      itemKey,
      qty,
      reward,
      endsAt: Date.now() + (6 * 60 * 1000)
    });
    return ctx.reply(
      `📣 <b>طلب كافيتيريا جماعي</b>\n\n` +
      `مين يجيب ${qty} ${LOUNGE_PRODUCTS[itemKey].name}؟\n` +
      `🎁 مكافأة أول مَن يسلّم: ${this.formatCurrency(reward)}\n\n` +
      `للتسليم اكتب: <b>سلم الطلب</b>`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleCafeDeliverCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const req = this.activeCafeRequests.get(String(ctx.chat.id));
    if (!req || Date.now() > Number(req.endsAt || 0)) {
      this.activeCafeRequests.delete(String(ctx.chat.id));
      return ctx.reply('ℹ️ ما في طلب كافيتيريا نشط حالياً.');
    }
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});
    if (Number(row.loungeInventory[req.itemKey] || 0) < Number(req.qty || 1)) {
      return ctx.reply(`❌ ما عندك الكمية الكافية للتسليم.\n• المطلوب: ${req.qty} ${LOUNGE_PRODUCTS[req.itemKey].name}`);
    }
    row.loungeInventory[req.itemKey] = Number(row.loungeInventory[req.itemKey] || 0) - Number(req.qty || 1);
    row.points = Number(row.points || 0) + Number(req.reward || 0);
    row.cafeProfile.reputation = Number(row.cafeProfile.reputation || 0) + 2;
    row.cafeProfile.ordersCompleted = Number(row.cafeProfile.ordersCompleted || 0) + 1;
    row.cafeProfile.cafeEarnings = Number(row.cafeProfile.cafeEarnings || 0) + Number(req.reward || 0);
    row.cafeProfile.weeklyCafeEarnings = Number(row.cafeProfile.weeklyCafeEarnings || 0) + Number(req.reward || 0);
    row.updatedAt = new Date();
    this.activeCafeRequests.delete(String(ctx.chat.id));
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(
      `✅ ${this.mentionUser(ctx.from.id, ctx.from.first_name || ctx.from.username || 'عضو')} سلّم الطلب أول واحد!\n` +
      `• المكافأة: ${this.formatCurrency(req.reward)}\n` +
      `• السمعة: ${row.cafeProfile.reputation}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleMoodCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});
    const activeMood = row.cafeProfile.moodUntil && new Date(row.cafeProfile.moodUntil).getTime() > Date.now();
    const bonus = activeMood ? '10%' : '0%';
    await group.save();
    return ctx.reply(
      `😌 مزاجك الحالي: ${row.cafeProfile.mood || 0}/100\n` +
      `• بونص اللعب المؤقت: ${bonus}\n` +
      `• السمعة: ${row.cafeProfile.reputation || 0}`
    );
  }

  static async handleCafeConsumeCommand(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const raw = String(ctx.message?.text || '').trim();
    const normalized = this.normalizeText(raw);
    const consumeRaw = raw
      .replace(/^\/\S+\s*/i, '')
      .replace(/^(اشرب|كل)\s*/i, '')
      .trim();
    const directToken = this.normalizeLoungeToken(consumeRaw || raw);
    let key = directToken;
    if (!key) {
      if (normalized === this.normalizeText('قهوة')) key = 'coffee';
      else if (normalized === this.normalizeText('شاي')) key = 'tea';
      else if (normalized === this.normalizeText('عصير')) key = 'juice';
    }
    if (!key || !CAFE_CONSUMABLE_KEYS.has(key)) return false;

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});

    if (Number(row.loungeInventory[key] || 0) <= 0) {
      return ctx.reply(`❌ ما عندك ${LOUNGE_PRODUCTS[key].name}. اشتريه أول.`);
    }
    row.loungeInventory[key] = Number(row.loungeInventory[key] || 0) - 1;
    const xpBoostMap = {
      coffee: 2, tea: 1, nescafe: 2, cappuccino: 2, chai_latte: 2,
      hot_chocolate: 2,
      juice: 1, mojito: 1, orange_juice: 1, lemon_juice: 1, fruit_juice: 1, banana_juice: 1,
      avocado_juice: 1, strawberry_juice: 1, mango_juice: 1,
      seven_up: 1, cola: 1, mirinda: 1
    };
    const moodBoostMap = {
      hot_chocolate: 3, cappuccino: 3, chai_latte: 3, nescafe: 3, coffee: 3,
      tea: 2, juice: 2, mojito: 2, orange_juice: 2, lemon_juice: 2, fruit_juice: 2, banana_juice: 2,
      avocado_juice: 2, strawberry_juice: 2, mango_juice: 2,
      seven_up: 2, cola: 2, mirinda: 2
    };
    const xpBoost = Number(xpBoostMap[key] || 1);
    const moodBoost = Number(moodBoostMap[key] || 2);
    row.cafeProfile.mood = Math.min(100, Number(row.cafeProfile.mood || 0) + moodBoost);
    row.cafeProfile.moodUntil = new Date(Date.now() + 15 * 60 * 1000);
    this.awardXp(row, xpBoost);
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(
      `✅ استمتعت بـ ${LOUNGE_PRODUCTS[key].name}\n` +
      `• +${xpBoost} XP\n` +
      `• +${moodBoost} مزاج\n` +
      `• مزاجك الآن: ${row.cafeProfile.mood}/100`
    );
  }

  static async handleCafeTopCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const weekly = await this.applyCafeWeeklyRewards(group);
    const rows = [...(group.gameSystem.scores || [])];
    rows.forEach((r) => { r.cafeProfile = this.resetCafeDailyAndWeekly(r.cafeProfile || {}); });
    rows.sort((a, b) => {
      const aScore = Number(a.cafeProfile?.weeklyCafeEarnings || 0) + (Number(a.cafeProfile?.reputation || 0) * 5);
      const bScore = Number(b.cafeProfile?.weeklyCafeEarnings || 0) + (Number(b.cafeProfile?.reputation || 0) * 5);
      return bScore - aScore;
    });
    const top = rows.slice(0, 10);
    if (top.length === 0) return ctx.reply('ℹ️ لا يوجد نشاط كافيتيريا بعد.');
    let text = '🏆 <b>توب الكافيتيريا</b>\n\n';
    if (weekly?.top?.length) {
      text += `🎁 تم صرف جوائز الأسبوع تلقائيًا (${this.getWeekKey()})\n\n`;
      await Promise.all(weekly.top.map(async (r) => {
        const doc = await this.ensureGlobalProfileAndSyncRow(
          r,
          { id: Number(r.userId), username: r.username, first_name: r.username }
        );
        await this.syncRowToGlobal(doc, r);
      }));
    }
    top.forEach((r, i) => {
      text += `${i + 1}. ${r.username || r.userId} — ربح أسبوعي ${this.formatCurrency(r.cafeProfile.weeklyCafeEarnings || 0)} | سمعة ${r.cafeProfile.reputation || 0}\n`;
    });
    await group.save();
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleHookahPuffsTopCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const rows = [...(group.gameSystem.scores || [])];
    rows.forEach((r) => { r.cafeProfile = this.resetCafeDailyAndWeekly(r.cafeProfile || {}); });
    rows.sort((a, b) => Number(b.cafeProfile?.hookahPuffs || 0) - Number(a.cafeProfile?.hookahPuffs || 0));
    const top = rows.slice(0, 10);
    if (top.length === 0) return ctx.reply('ℹ️ لا يوجد بيانات نفخات أرجيلة بعد.');
    let text = '🫧 <b>توب نفس الأرجيلة</b>\n\n';
    top.forEach((r, i) => {
      text += `${i + 1}. ${r.username || r.userId} — ${r.cafeProfile.hookahPuffs || 0} نفس\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleSmokePuffsTopCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const rows = [...(group.gameSystem.scores || [])];
    rows.forEach((r) => { r.cafeProfile = this.resetCafeDailyAndWeekly(r.cafeProfile || {}); });
    rows.sort((a, b) => Number(b.cafeProfile?.smokePuffs || 0) - Number(a.cafeProfile?.smokePuffs || 0));
    const top = rows.slice(0, 10);
    if (top.length === 0) return ctx.reply('ℹ️ لا يوجد بيانات دخان بعد.');
    let text = '🚬 <b>توب الدخان</b>\n\n';
    top.forEach((r, i) => {
      text += `${i + 1}. ${r.username || r.userId} — ${r.cafeProfile.smokePuffs || 0} نفس\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static getActiveHookahSession(chatId) {
    const key = String(chatId);
    const s = this.activeHookahSessions.get(key);
    if (!s) return null;
    if (Date.now() > Number(s.endsAt || 0)) {
      this.activeHookahSessions.delete(key);
      return null;
    }
    return s;
  }

  static async finalizeHookahSession(ctx, session, reason = 'end') {
    this.activeHookahSessions.delete(String(session.chatId));
    const members = Array.from(session.members.values());
    members.sort((a, b) => Number(b.puffs || 0) - Number(a.puffs || 0));
    const top = members[0];
    const reasonText = reason === 'expired' ? '⏰ انتهى وقت الجلسة.' : '🛑 تم إنهاء الجلسة.';
    let text = `🪩 <b>انتهت جلسة الأرجيلة</b>\n\n${reasonText}\n`;
    if (top) {
      text += `🥇 الأكثر نفسًا: ${top.name} (${top.puffs} نفس)\n`;
      text += `😎 صاحب المزاج: ${top.name}`;
    } else {
      text += 'ما حدا شارك للأسف.';
    }
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleHookahSessionOpen(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const existing = this.getActiveHookahSession(ctx.chat.id);
    if (existing) return ctx.reply('⏳ في جلسة أرجيلة شغالة بالفعل.');
    const session = {
      chatId: String(ctx.chat.id),
      ownerId: Number(ctx.from.id),
      endsAt: Date.now() + (10 * 60 * 1000),
      members: new Map()
    };
    session.members.set(Number(ctx.from.id), {
      userId: Number(ctx.from.id),
      name: ctx.from.first_name || ctx.from.username || String(ctx.from.id),
      puffs: 0
    });
    this.activeHookahSessions.set(String(ctx.chat.id), session);
    return ctx.reply(
      `🪩 بدأت جلسة أرجيلة لمدة 10 دقائق!\n` +
      `• للانضمام: انضم\n` +
      `• للنفس داخل الجلسة: نفس`
    );
  }

  static async handleHookahSessionJoin(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const session = this.getActiveHookahSession(ctx.chat.id);
    if (!session) return ctx.reply('ℹ️ ما في جلسة أرجيلة نشطة الآن.');
    const uid = Number(ctx.from.id);
    if (!session.members.has(uid)) {
      session.members.set(uid, { userId: uid, name: ctx.from.first_name || ctx.from.username || String(uid), puffs: 0 });
    }
    return ctx.reply(`✅ ${ctx.from.first_name || 'عضو'} انضم للجلسة.`);
  }

  static async handleHookahSessionPuff(ctx) {
    if (!this.isGroupChat(ctx)) return false;
    const session = this.getActiveHookahSession(ctx.chat.id);
    if (!session) return false;
    if (Date.now() > Number(session.endsAt || 0)) {
      await this.finalizeHookahSession(ctx, session, 'expired');
      return true;
    }
    const uid = Number(ctx.from.id);
    if (!session.members.has(uid)) {
      return ctx.reply('❌ لازم تنضم أول: اكتب "انضم"');
    }
    const rowGroup = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(rowGroup, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    row.cafeProfile = this.resetCafeDailyAndWeekly(row.cafeProfile || {});
    row.cafeProfile.hookahPuffs = Number(row.cafeProfile.hookahPuffs || 0) + 1;
    row.cafeProfile.loungePuffs = Number(row.cafeProfile.loungePuffs || 0) + 1;
    row.cafeProfile.puffsToday = Number(row.cafeProfile.puffsToday || 0) + 1;
    row.points = Number(row.points || 0) + 1;
    row.updatedAt = new Date();
    const m = session.members.get(uid);
    m.puffs = Number(m.puffs || 0) + 1;
    session.members.set(uid, m);
    await rowGroup.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(`💨 نفس رايق! ${ctx.from.first_name || 'عضو'} صار عنده ${m.puffs} نفس داخل الجلسة.`);
  }

  static async handleGroupProfileCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    const rank = this.getUserRank(group, ctx.from.id) || '-';
    const tier = row.tier || this.resolveTierFromXp(row.xp || 0).name;
    const nextTier = this.nextTierFromXp(row.xp || 0);
    const gifts = (row.giftInventory || []).filter((g) => (g.count || 0) > 0)
      .slice(0, 6)
      .map((g) => `${g.name}×${g.count}`)
      .join(' | ') || 'لا يوجد';

    await group.save();
    return ctx.reply(
      `👤 <b>ملفك في الجروب</b>\n\n` +
      `🏷️ اللقب: ${row.title || 'مبتدئ'}\n` +
      `💰 الرصيد: ${this.formatCurrency(row.points || 0)}\n` +
      `⭐ XP: ${row.xp || 0}\n` +
      `🎖️ المستوى: ${tier}\n` +
      `${nextTier ? `⏭️ القادم: ${nextTier.name} بعد ${nextTier.remainingXp} XP\n` : '👑 وصلت أعلى مستوى (الماسي)\n'}` +
      `🏁 ترتيبك: #${rank}\n` +
      `🎁 الهدايا: ${gifts}\n` +
      `📤 مرسل: ${row.giftsSent || 0} | 📥 مستلم: ${row.giftsReceived || 0}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleMyMoneyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    await group.save();

    const userMention = this.mentionUser(
      ctx.from?.id,
      ctx.from?.first_name || ctx.from?.username || 'عضو'
    );
    const balance = Number(row.points || 0);
    if (balance <= 0) {
      return ctx.reply(`${userMention}\n• فلوسك ${this.formatCurrency(0)}`, { parse_mode: 'HTML' });
    }
    return ctx.reply(`${userMention}\n• عدد فلوسك التي ربحتها ↤︎ ${this.formatCurrency(balance)}`, { parse_mode: 'HTML' });
  }

  static async handleInvestAllCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    const todayKey = this.getDateKey();
    if (String(row.investDayKey || '') === todayKey) {
      return ctx.reply('⏳ استثمرت اليوم بالفعل. تقدر تستثمر مرة واحدة فقط كل يوم.');
    }
    const current = Math.max(0, Math.floor(Number(row.points || 0)));
    const mention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');

    if (current <= 0) {
      await group.save();
      return ctx.reply(`${mention}\n❌ ما عندك فلوس للاستثمار.\n• فلوسك ${this.formatCurrency(0)}`, { parse_mode: 'HTML' });
    }

    const rate = 10;
    const profit = Math.max(1, Math.floor(current * (rate / 100)));
    row.points = current + profit;
    row.investDayKey = todayKey;
    row.investLastAt = new Date();
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    return ctx.reply(
      `${mention}\n\n` +
      `• استثمار ناجح\n` +
      `• نسبة الربح ↢ ${rate}%\n` +
      `• مبلغ الربح ↢ ( ${this.formatCurrency(profit)} )\n` +
      `• فلوسك صارت ↢ ( ${this.formatCurrency(row.points || 0)} )`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static async handleLuckCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    this.resetLuckDailyIfNeeded(row);
    if ((row.luckPlaysToday || 0) >= LUCK_DAILY_LIMIT) {
      return ctx.reply(`🧾 وصلت الحد اليومي للمحاولات (${LUCK_DAILY_LIMIT}). ارجع بكرة.`);
    }
    await group.save();
    const key = `${String(ctx.chat.id)}:${Number(ctx.from?.id || 0)}`;
    this.pendingLuckInputs.set(key, { createdAt: Date.now() });
    return ctx.reply(
      `🎯 <b>وضع الحظ</b>\n` +
      `اختَر رقم واحد فقط بين <b>${LUCK_MIN_RANGE}</b> و <b>${LUCK_MAX_RANGE}</b>.\n` +
      `• محاولاتك اليوم ↢ ( ${row.luckPlaysToday}/${LUCK_DAILY_LIMIT} )\n` +
      '• لا يمكنك استخدام نفس الرقم مرتين في نفس اليوم.',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static async handleLuckStatsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    this.resetLuckDailyIfNeeded(row);
    await group.save();

    const usedToday = (row.luckUsedNumbers || []).length;
    const remaining = Math.max(0, LUCK_DAILY_LIMIT - Number(row.luckPlaysToday || 0));
    const winRate = Number(row.luckTotalPlays || 0) > 0
      ? ((Number(row.luckTotalWins || 0) / Number(row.luckTotalPlays || 0)) * 100).toFixed(1)
      : '0.0';

    return ctx.reply(
      `📊 <b>إحصائيات الحظ</b>\n\n` +
      `• محاولاتك اليوم: ${row.luckPlaysToday || 0}/${LUCK_DAILY_LIMIT}\n` +
      `• المتبقي اليوم: ${remaining}\n` +
      `• الأرقام المستخدمة اليوم: ${usedToday}\n\n` +
      `• إجمالي المحاولات: ${row.luckTotalPlays || 0}\n` +
      `• إجمالي مرات الربح: ${row.luckTotalWins || 0}\n` +
      `• نسبة الفوز: ${winRate}%\n` +
      `• إجمالي أرباح الحظ: ${this.formatCurrency(row.luckTotalPayout || 0)}\n\n` +
      '💡 استخدم: حظ',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static parseResourceKey(input) {
    const x = this.normalizeText(String(input || ''));
    const map = {
      wood: ['wood', 'خشب'],
      stone: ['stone', 'حجر'],
      food: ['food', 'غذاء', 'طعام'],
      iron: ['iron', 'حديد'],
      gold: ['gold', 'ذهب']
    };
    return Object.keys(map).find((k) => map[k].some((a) => this.normalizeText(a) === x)) || null;
  }

  static getCastlePower(row) {
    return Math.max(0, (Number(row.castleLevel || 1) * 20) + Number(row.armyPower || 0) + Math.floor(Number(row.armyUnits || 0) / 100));
  }

  static isShieldActive(row) {
    return Boolean(row?.shieldUntil && new Date(row.shieldUntil).getTime() > Date.now());
  }

  static formatResources(resources = {}) {
    const r = resources || {};
    return `🪵 خشب: ${Number(r.wood || 0)} | 🪨 حجر: ${Number(r.stone || 0)} | 🍖 غذاء: ${Number(r.food || 0)} | ⛓️ حديد: ${Number(r.iron || 0)} | 🪙 ذهب: ${Number(r.gold || 0)}`;
  }

  static async handleCreateCastleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (row.castleCreated) return ctx.reply('🏰 قلعتك موجودة بالفعل. استخدم: قلعتي');
    row.castleCreated = true;
    row.castleLevel = 1;
    row.castleResources = row.castleResources || {};
    RESOURCE_KEYS.forEach((k) => {
      row.castleResources[k] = Number(row.castleResources[k] || 0) + (k === 'gold' ? 5 : 20);
    });
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(
      '🏰 تم إنشاء قلعتك بنجاح!\n' +
      '• المستوى: 1\n' +
      `• موارد البداية:\n${this.formatResources(row.castleResources)}\n` +
      '💡 استخدم: متجر الموارد | شراء موارد خشب 30 | تطوير قلعتي'
    );
  }

  static async handleMyCastleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.castleCreated) return ctx.reply('❌ ما عندك قلعة بعد. اكتب: انشاء قلعه');
    const shield = this.isShieldActive(row)
      ? `✅ مفعلة حتى ${new Date(row.shieldUntil).toLocaleString('ar-EG')}`
      : '❌ غير مفعلة';
    return ctx.reply(
      `🏰 <b>قلعتك</b>\n\n` +
      `• المستوى: ${row.castleLevel || 1}\n` +
      `• قوة القلعة: ${this.getCastlePower(row)}\n` +
      `• المعسكر: ${row.barracksCreated ? `✅ مستوى ${row.barracksLevel || 1}` : '❌ غير منشأ'}\n` +
      `• الجيش: ${Number(row.armyUnits || 0)} جندي\n` +
      `• قوة الجيش: ${Number(row.armyPower || 0)}\n` +
      `• الحصانة: ${shield}\n\n` +
      `${this.formatResources(row.castleResources)}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleResourceStoreCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    return ctx.reply(
      `🧱 <b>متجر الموارد</b>\n\n` +
      `• كل 3 موارد عادية = ${this.formatCurrency(1)}\n` +
      `• الذهب: كل 1 = ${this.formatCurrency(1)}\n` +
      `• الحد لكل شراء: موارد عادية ${MAX_NORMAL_RESOURCE_BUY} | ذهب ${MAX_GOLD_RESOURCE_BUY}\n\n` +
      'أمثلة:\n' +
      '• شراء موارد خشب 30\n' +
      '• شراء موارد حجر 60\n' +
      '• شراء موارد ذهب 5',
      { parse_mode: 'HTML' }
    );
  }

  static async handleBuyResourcesCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    if (args.length < 2) return ctx.reply('❌ الصيغة: شراء موارد [الاسم] [العدد]');
    const n0 = this.normalizeText(String(args[0] || ''));
    const n1 = this.normalizeText(String(args[1] || ''));
    let startIdx = 0;
    if (n0 === 'موارد') startIdx = 1;
    else if (n0 === 'شراء' && n1 === 'موارد') startIdx = 2;
    const resourceKey = this.parseResourceKey(args[startIdx]);
    const qty = Math.max(1, parseInt(args[startIdx + 1], 10) || 0);
    if (!resourceKey || !Number.isInteger(qty)) return ctx.reply('❌ مورد غير معروف. استخدم: خشب/حجر/غذاء/حديد/ذهب');

    const maxQty = resourceKey === 'gold' ? MAX_GOLD_RESOURCE_BUY : MAX_NORMAL_RESOURCE_BUY;
    if (qty > maxQty) return ctx.reply(`❌ الحد الأقصى لهذا الشراء هو ${maxQty}.`);

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.castleCreated) return ctx.reply('❌ أنشئ قلعتك أولاً: انشاء قلعه');

    const cost = resourceKey === 'gold'
      ? Math.ceil(qty * GOLD_RESOURCE_UNIT_COST)
      : Math.ceil(qty * NORMAL_RESOURCE_UNIT_COST);
    if ((row.points || 0) < cost) return ctx.reply(`❌ فلوسك غير كافية. التكلفة: ${this.formatCurrency(cost)}`);

    row.points = Number(row.points || 0) - cost;
    row.castleResources = row.castleResources || {};
    row.castleResources[resourceKey] = Number(row.castleResources[resourceKey] || 0) + qty;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    return ctx.reply(
      `✅ تم شراء ${qty} ${RESOURCE_AR[resourceKey]}.\n` +
      `• التكلفة: ${this.formatCurrency(cost)}\n` +
      `• رصيدك الآن: ${this.formatCurrency(row.points || 0)}\n` +
      `${this.formatResources(row.castleResources)}`
    );
  }

  static async handleMyResourcesCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.castleCreated) return ctx.reply('❌ أنشئ قلعتك أولاً: انشاء قلعه');
    return ctx.reply(`📦 <b>مواردك</b>\n\n${this.formatResources(row.castleResources)}`, { parse_mode: 'HTML' });
  }

  static async handleUpgradeCastleCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.castleCreated) return ctx.reply('❌ أنشئ قلعتك أولاً: انشاء قلعه');

    const now = Date.now();
    const last = row.castleLastUpgradeAt ? new Date(row.castleLastUpgradeAt).getTime() : 0;
    const cooldownMs = CASTLE_UPGRADE_COOLDOWN_MIN * 60 * 1000;
    if (last && (now - last) < cooldownMs) {
      const left = Math.ceil((cooldownMs - (now - last)) / 60000);
      return ctx.reply(`⏳ تقدر تطور قلعتك بعد ${left} دقيقة.`);
    }

    const need = {
      wood: 20 + (row.castleLevel * 10),
      stone: 20 + (row.castleLevel * 10),
      food: 15 + (row.castleLevel * 8),
      iron: 10 + (row.castleLevel * 6),
      gold: 2 + Math.floor(row.castleLevel / 2)
    };
    const hasAll = RESOURCE_KEYS.every((k) => Number(row.castleResources?.[k] || 0) >= Number(need[k] || 0));
    if (!hasAll) {
      return ctx.reply(
        '❌ مواردك لا تكفي للتطوير.\n' +
        `المطلوب: ${this.formatResources(need)}\n` +
        `المتاح: ${this.formatResources(row.castleResources)}`
      );
    }

    RESOURCE_KEYS.forEach((k) => {
      row.castleResources[k] = Number(row.castleResources[k] || 0) - Number(need[k] || 0);
    });
    row.castleLevel = Number(row.castleLevel || 1) + 1;
    row.castleLastUpgradeAt = new Date();
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    return ctx.reply(`🏰 تم تطوير قلعتك إلى المستوى ${row.castleLevel}!`);
  }

  static async handleCreateBarracksCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.castleCreated) return ctx.reply('❌ أنشئ قلعتك أولاً: انشاء قلعه');
    if (row.barracksCreated) return ctx.reply('✅ معسكرك موجود بالفعل.');
    row.barracksCreated = true;
    row.barracksLevel = 1;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply('🏕️ تم إنشاء المعسكر بنجاح. اكتب: شراء جيش 100');
  }

  static async handleBuyArmyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    const n0 = this.normalizeText(String(args[0] || ''));
    const n1 = this.normalizeText(String(args[1] || ''));
    let startIdx = 0;
    if (n0 === 'جيش') startIdx = 1;
    else if (n0 === 'شراء' && n1 === 'جيش') startIdx = 2;
    const qty = Math.max(1, parseInt(args[startIdx], 10) || 0);
    if (!Number.isInteger(qty)) return ctx.reply('❌ الصيغة: شراء جيش [العدد]');
    if (qty > MAX_ARMY_BUY) return ctx.reply(`❌ الحد الأقصى للشراء مرة واحدة هو ${MAX_ARMY_BUY}.`);

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.barracksCreated) return ctx.reply('❌ أنشئ المعسكر أولًا: انشاء معكسر');

    const cost = Math.ceil(qty * ARMY_UNIT_PRICE);
    if ((row.points || 0) < cost) return ctx.reply(`❌ فلوسك غير كافية. تكلفة ${qty} جندي هي ${this.formatCurrency(cost)}.`);

    row.points = Number(row.points || 0) - cost;
    row.armyUnits = Number(row.armyUnits || 0) + qty;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(`✅ تم شراء ${qty} جندي.\n• التكلفة: ${this.formatCurrency(cost)}\n• جيشك الآن: ${row.armyUnits}`);
  }

  static async handleUpgradeArmyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.barracksCreated) return ctx.reply('❌ أنشئ المعسكر أولًا: انشاء معكسر');
    if ((row.armyUnits || 0) < ARMY_POWER_UPGRADE_UNITS) {
      return ctx.reply(`❌ تحتاج ${ARMY_POWER_UPGRADE_UNITS} جندي للتطوير. المتاح: ${row.armyUnits || 0}`);
    }
    row.armyUnits = Number(row.armyUnits || 0) - ARMY_POWER_UPGRADE_UNITS;
    row.armyPower = Number(row.armyPower || 0) + 1;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(`⚔️ تم تطوير الجيش بنجاح.\n• قوة الجيش: ${row.armyPower}\n• الجنود المتبقين: ${row.armyUnits}`);
  }

  static async handleTreasureSearchCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.castleCreated) return ctx.reply('❌ أنشئ قلعتك أولًا: انشاء قلعه');
    const now = Date.now();
    const last = row.treasureLastAt ? new Date(row.treasureLastAt).getTime() : 0;
    const cooldownMs = TREASURE_COOLDOWN_MIN * 60 * 1000;
    if (last && (now - last) < cooldownMs) {
      const left = Math.ceil((cooldownMs - (now - last)) / 60000);
      return ctx.reply(`⏳ تقدر تبحث عن الكنز بعد ${left} دقيقة.`);
    }

    const roll = Math.random();
    let message = '';
    if (roll < 0.4) {
      const qty = 10 + Math.floor(Math.random() * 31);
      const pool = ['wood', 'stone', 'food', 'iron'];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      row.castleResources[picked] = Number(row.castleResources[picked] || 0) + qty;
      message = `🧰 لقيت ${qty} ${RESOURCE_AR[picked]}!`;
    } else if (roll < 0.75) {
      const qty = 50 + Math.floor(Math.random() * 251);
      row.armyUnits = Number(row.armyUnits || 0) + qty;
      message = `🪖 لقيت ${qty} جندي إضافي لجيشك!`;
    } else if (roll < 0.95) {
      row.shieldCards = Number(row.shieldCards || 0) + 1;
      message = '🛡️ حصلت على بطاقة حصانة واحدة!';
    } else {
      const gold = 2 + Math.floor(Math.random() * 4);
      row.castleResources.gold = Number(row.castleResources.gold || 0) + gold;
      message = `🏆 كنز نادر! حصلت على ${gold} ذهب.`;
    }
    row.treasureLastAt = new Date();
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply(`🔎 <b>بحث الكنز</b>\n\n${message}`, { parse_mode: 'HTML' });
  }

  static async handleShieldToggleCommand(ctx, force = null) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.castleCreated) return ctx.reply('❌ أنشئ قلعتك أولًا: انشاء قلعه');
    const active = this.isShieldActive(row);

    let action = force;
    if (!action) {
      const txt = this.normalizeText(String(ctx.message?.text || ''));
      if (txt.includes('تعطيل')) action = 'off';
      else if (txt.includes('تفعيل')) action = 'on';
    }
    if (!action) action = active ? 'off' : 'on';

    if (action === 'on') {
      if (active) return ctx.reply('✅ الحصانة مفعلة بالفعل.');
      if ((row.shieldCards || 0) < 1) return ctx.reply('❌ ما عندك بطاقة حصانة. جرّب: بحث الكنز');
      row.shieldCards = Number(row.shieldCards || 0) - 1;
      row.shieldUntil = new Date(Date.now() + SHIELD_DURATION_MIN * 60 * 1000);
      row.updatedAt = new Date();
      await group.save();
      await this.syncRowToGlobal(userDoc, row);
      return ctx.reply(`🛡️ تم تفعيل الحصانة لمدة ${SHIELD_DURATION_MIN} دقيقة.`);
    }

    row.shieldUntil = null;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply('✅ تم تعطيل الحصانة.');
  }

  static async handleMyShieldCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    const active = this.isShieldActive(row);
    if (!active) {
      return ctx.reply(`🛡️ حصانتك: غير مفعلة\n• بطاقاتك: ${row.shieldCards || 0}`);
    }
    const leftMin = Math.max(0, Math.ceil((new Date(row.shieldUntil).getTime() - Date.now()) / 60000));
    return ctx.reply(`🛡️ حصانتك مفعلة\n• المتبقي: ${leftMin} دقيقة\n• بطاقاتك: ${row.shieldCards || 0}`);
  }

  static async handleCastleDuelCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const targetUser = ctx.message?.reply_to_message?.from;
    if (!targetUser?.id) return ctx.reply('❌ هذه المبارزة بالرد فقط على العضو.');
    if (Number(targetUser.id) === Number(ctx.from.id)) return ctx.reply('❌ لا يمكنك مبارزة نفسك.');

    const me = this.getOrCreateScoreRow(group, ctx.from);
    const other = this.getOrCreateScoreRow(group, targetUser);
    const meDoc = await this.ensureGlobalProfileAndSyncRow(me, ctx.from);
    const otherDoc = await this.ensureGlobalProfileAndSyncRow(other, targetUser);
    if (!me.castleCreated || !other.castleCreated) return ctx.reply('❌ يجب أن يكون لدى الطرفين قلعة.');
    if (this.isShieldActive(other)) return ctx.reply('🛡️ هذا العضو محمي بالحصانة حاليًا.');

    const myPower = this.getCastlePower(me) + Math.floor(Math.random() * 31);
    const hisPower = this.getCastlePower(other) + Math.floor(Math.random() * 31);
    const iWin = myPower >= hisPower;
    const winner = iWin ? me : other;
    const loser = iWin ? other : me;
    const winnerUser = iWin ? ctx.from : targetUser;
    const loserUser = iWin ? targetUser : ctx.from;

    const steal = Math.max(1, Math.min(10, Number(loser.points || 0)));
    loser.points = Number(loser.points || 0) - steal;
    winner.points = Number(winner.points || 0) + steal;
    winner.duelWins = Number(winner.duelWins || 0) + 1;
    loser.duelLosses = Number(loser.duelLosses || 0) + 1;

    group.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(meDoc, me);
    await this.syncRowToGlobal(otherDoc, other);
    return ctx.reply(
      `⚔️ <b>نتيجة المبارزة</b>\n\n` +
      `• قوة ${ctx.from.first_name || 'اللاعب'}: ${myPower}\n` +
      `• قوة ${targetUser.first_name || 'الخصم'}: ${hisPower}\n` +
      `• الفائز: ${this.mentionUser(winnerUser.id, winnerUser.first_name || winnerUser.username || winnerUser.id)}\n` +
      `• خسارة الخاسر: ${this.formatCurrency(steal)}\n` +
      `• الخاسر: ${this.mentionUser(loserUser.id, loserUser.first_name || loserUser.username || loserUser.id)}`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static async handleArenaJoinCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    if (!row.castleCreated) return ctx.reply('❌ أنشئ قلعتك أولًا: انشاء قلعه');
    row.arenaJoined = true;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);
    return ctx.reply('✅ تم انضمامك للمبارزة العالمية.');
  }

  static async handleArenaListCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const joined = (group.gameSystem.scores || []).filter((x) => x.arenaJoined);
    if (joined.length === 0) return ctx.reply('ℹ️ لا يوجد مشاركين بعد. اكتب: الانضمام للمبارزه');
    const lines = joined
      .sort((a, b) => this.getCastlePower(b) - this.getCastlePower(a))
      .slice(0, 20)
      .map((x, i) => `${i + 1}. ${x.username || x.userId} — قوة: ${this.getCastlePower(x)}`);
    return ctx.reply(`🌍 <b>المبارزين</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  }

  static async handleTopRulersCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const list = (group.gameSystem.scores || [])
      .filter((x) => x.castleCreated)
      .sort((a, b) => {
        const byCastle = Number(b.castleLevel || 0) - Number(a.castleLevel || 0);
        if (byCastle !== 0) return byCastle;
        const byPower = this.getCastlePower(b) - this.getCastlePower(a);
        if (byPower !== 0) return byPower;
        return Number(b.points || 0) - Number(a.points || 0);
      })
      .slice(0, 10);
    if (list.length === 0) return ctx.reply('ℹ️ لا يوجد حكام بعد. ابدأوا بـ انشاء قلعه');

    (group.gameSystem.scores || []).forEach((r) => {
      if (['🤴🏻 الحاكم', '🫅🏻 الحاكمة'].includes(String(r.title || ''))) {
        r.customTitle = false;
        const tier = this.resolveTierFromXp(r.xp || 0);
        r.title = `${tier.icon} ${tier.name}`;
      }
    });
    const top = list[0];
    top.title = '🤴🏻 الحاكم';
    top.customTitle = true;
    await group.save();

    const lines = list.map((x, i) => `${i + 1}. ${x.username || x.userId} — مستوى القلعة ${x.castleLevel} | قوة ${this.getCastlePower(x)}`);
    return ctx.reply(`👑 <b>توب الحكام</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  }

  static async handleAllianceRequestCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    const targetArg = args.find((x) => String(x).startsWith('@') || /^\d+$/.test(String(x))) || null;
    const group = await this.ensureGroupRecord(ctx);
    const target = this.resolveTargetUser(ctx, group, targetArg);
    if (!target?.id) return ctx.reply('❌ استخدم: تحالف @user');
    if (Number(target.id) === Number(ctx.from.id)) return ctx.reply('❌ لا يمكنك طلب تحالف مع نفسك.');

    const chatKey = String(ctx.chat.id);
    const key = `${chatKey}:${ctx.from.id}:${target.id}`;
    this.pendingAlliances.set(key, {
      chatId: chatKey,
      fromId: Number(ctx.from.id),
      fromName: ctx.from.first_name || ctx.from.username || String(ctx.from.id),
      toId: Number(target.id),
      toName: target.first_name || target.username || String(target.id),
      status: 'pending',
      createdAt: Date.now()
    });
    return ctx.reply(
      `🤝 تم إرسال طلب تحالف إلى ${this.mentionUser(target.id, target.first_name || target.username || target.id)}\n` +
      'العضو يقدر يرد بـ: قبول تحالف أو رفض تحالف',
      { parse_mode: 'HTML' }
    );
  }

  static async handleAllianceRequestsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const chatKey = String(ctx.chat.id);
    const me = Number(ctx.from.id);
    const incoming = Array.from(this.pendingAlliances.values()).filter((x) => x.chatId === chatKey && x.toId === me);
    if (incoming.length === 0) return ctx.reply('ℹ️ لا توجد طلبات تحالف حالياً.');
    const lines = incoming.map((x, i) => `${i + 1}. من: ${x.fromName} | الحالة: ${x.status}`);
    return ctx.reply(`📨 <b>طلبات التحالف</b>\n\n${lines.join('\n')}`, { parse_mode: 'HTML' });
  }

  static async handleAllianceDecisionCommand(ctx, decision = 'accept') {
    if (!this.isGroupChat(ctx)) return;
    const chatKey = String(ctx.chat.id);
    const me = Number(ctx.from.id);
    const pending = Array.from(this.pendingAlliances.entries()).find(([, x]) => x.chatId === chatKey && x.toId === me && x.status === 'pending');
    if (!pending) return ctx.reply('ℹ️ لا يوجد طلب تحالف معلّق.');

    const [key, req] = pending;
    if (decision === 'reject') {
      req.status = 'rejected';
      this.pendingAlliances.set(key, req);
      return ctx.reply('❌ تم رفض طلب التحالف.');
    }

    req.status = 'accepted';
    this.pendingAlliances.set(key, req);

    const group = await this.ensureGroupRecord(ctx);
    const fromRow = (group.gameSystem.scores || []).find((x) => Number(x.userId) === Number(req.fromId));
    const toRow = (group.gameSystem.scores || []).find((x) => Number(x.userId) === Number(req.toId));
    const target = (group.gameSystem.scores || [])
      .filter((x) => Number(x.userId) !== Number(req.fromId) && Number(x.userId) !== Number(req.toId))
      .sort((a, b) => this.getCastlePower(b) - this.getCastlePower(a))[0];
    if (!fromRow || !toRow || !target) return ctx.reply('ℹ️ تم قبول التحالف، لكن لا يوجد هدف مناسب للغارة الآن.');
    const fromDoc = await this.ensureGlobalProfileAndSyncRow(fromRow, { id: req.fromId, username: fromRow.username, first_name: fromRow.username });
    const toDoc = await this.ensureGlobalProfileAndSyncRow(toRow, { id: req.toId, username: toRow.username, first_name: toRow.username });
    const targetDoc = await this.ensureGlobalProfileAndSyncRow(target, { id: target.userId, username: target.username, first_name: target.username });

    const alliancePower = this.getCastlePower(fromRow) + this.getCastlePower(toRow);
    const targetPower = this.getCastlePower(target) + Math.floor(Math.random() * 31);
    const success = alliancePower >= targetPower;
    if (success) {
      const loss = Math.max(5, Math.min(30, Number(target.points || 0)));
      target.points = Number(target.points || 0) - loss;
      fromRow.points = Number(fromRow.points || 0) + Math.floor(loss / 2);
      toRow.points = Number(toRow.points || 0) + Math.ceil(loss / 2);
    }
    await group.save();
    await this.syncRowToGlobal(fromDoc, fromRow);
    await this.syncRowToGlobal(toDoc, toRow);
    await this.syncRowToGlobal(targetDoc, target);
    return ctx.reply(
      `🤝 <b>نتيجة التحالف</b>\n\n` +
      `• القوة المشتركة: ${alliancePower}\n` +
      `• قوة الهدف: ${targetPower}\n` +
      `• الهدف: ${target.username || target.userId}\n` +
      `• النتيجة: ${success ? '✅ غارة ناجحة' : '❌ الغارة فشلت'}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleScratchCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    let rounds = parseInt(args.find((x) => /^\d+$/.test(String(x))) || '1', 10);
    if (!Number.isInteger(rounds) || rounds < 1) rounds = 1;
    rounds = Math.min(rounds, 5);

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    this.resetScratchDailyIfNeeded(row);

    const now = Date.now();
    const lastAt = row.scratchLastPlayAt ? new Date(row.scratchLastPlayAt).getTime() : 0;
    const cooldownLeft = Math.ceil((SCRATCH_COOLDOWN_SEC * 1000 - (now - lastAt)) / 1000);
    if (cooldownLeft > 0) {
      return ctx.reply(`⏳ انتظر ${cooldownLeft} ثانية قبل الكشط مرة ثانية.`);
    }

    const leftToday = Math.max(0, SCRATCH_MAX_DAILY_PLAYS - Number(row.scratchPlaysToday || 0));
    if (leftToday <= 0) {
      return ctx.reply(`🧾 وصلت الحد اليومي للكشط (${SCRATCH_MAX_DAILY_PLAYS}). ارجع بكرة.`);
    }
    rounds = Math.min(rounds, leftToday);

    const totalCost = rounds * SCRATCH_TICKET_PRICE;
    if ((row.points || 0) < totalCost) {
      return ctx.reply(
        `❌ فلوسك غير كافية.\n` +
        `• سعر البطاقة: ${this.formatCurrency(SCRATCH_TICKET_PRICE)}\n` +
        `• المطلوب لـ ${rounds}: ${this.formatCurrency(totalCost)}`,
        { reply_to_message_id: ctx.message?.message_id }
      );
    }

    row.points -= totalCost;
    row.scratchPlaysToday = Number(row.scratchPlaysToday || 0) + rounds;
    row.scratchTotalPlays = Number(row.scratchTotalPlays || 0) + rounds;
    row.scratchLastPlayAt = new Date();

    const lines = [];
    let wins = 0;
    let totalPayout = 0;
    for (let i = 0; i < rounds; i += 1) {
      const outcome = this.rollScratchOutcome();
      if (outcome.payout > 0) wins += 1;
      totalPayout += Number(outcome.payout || 0);
      lines.push(`${i + 1}) ${outcome.label}${outcome.payout > 0 ? ` +${this.formatCurrency(outcome.payout)}` : ''}`);
    }

    row.points += totalPayout;
    row.scratchTotalWins = Number(row.scratchTotalWins || 0) + wins;
    row.scratchTotalPayout = Number(row.scratchTotalPayout || 0) + totalPayout;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    const net = totalPayout - totalCost;
    const mention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');
    return ctx.reply(
      `${mention}\n` +
      `🧾 <b>نتيجة الكشط</b>\n` +
      `• عدد البطاقات: ${rounds}\n` +
      `• التكلفة: ${this.formatCurrency(totalCost)}\n` +
      `• مجموع الربح: ${this.formatCurrency(totalPayout)}\n` +
      `• الصافي: ${net >= 0 ? '+' : ''}${this.formatCurrency(net)}\n` +
      `• فلوسك الآن: ${this.formatCurrency(row.points || 0)}\n` +
      `• المتبقي اليوم: ${Math.max(0, SCRATCH_MAX_DAILY_PLAYS - Number(row.scratchPlaysToday || 0))}\n\n` +
      `${lines.join('\n')}`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static async handleScratchStatsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    this.resetScratchDailyIfNeeded(row);
    await group.save();

    const totalPlays = Number(row.scratchTotalPlays || 0);
    const totalWins = Number(row.scratchTotalWins || 0);
    const totalPayout = Number(row.scratchTotalPayout || 0);
    const winRate = totalPlays > 0 ? ((totalWins / totalPlays) * 100).toFixed(1) : '0.0';

    return ctx.reply(
      `📊 <b>إحصائيات الكشط</b>\n\n` +
      `• سعر البطاقة: ${this.formatCurrency(SCRATCH_TICKET_PRICE)}\n` +
      `• حد يومي: ${SCRATCH_MAX_DAILY_PLAYS}\n` +
      `• مستخدم اليوم: ${Number(row.scratchPlaysToday || 0)}\n` +
      `• متبقي اليوم: ${Math.max(0, SCRATCH_MAX_DAILY_PLAYS - Number(row.scratchPlaysToday || 0))}\n\n` +
      `• إجمالي المحاولات: ${totalPlays}\n` +
      `• مرات الربح: ${totalWins}\n` +
      `• نسبة الفوز: ${winRate}%\n` +
      `• إجمالي مبالغ الربح: ${this.formatCurrency(totalPayout)}\n\n` +
      '💡 استخدم: /gscratch أو "كشط"',
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static async handleGiftCatalogCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const list = UNIQUE_GIFTS.map((g) => `• <code>${g.key}</code> → ${g.name} (${this.formatCurrency(g.price)})`).join('\n');
    return ctx.reply(
      `🎁 <b>الهدايا الفريدة (للجروب)</b>\n\n${list}\n\n` +
      `الإهداء: <code>/ggift مفتاح_الهدية @user [العدد]</code>\n` +
      `شراء لنفسك: <code>/gbuygift مفتاح_الهدية [العدد]</code>\n` +
      `بيع من ممتلكاتك: <code>/gsellgift مفتاح_الهدية [العدد]</code>\n` +
      `سعر البيع للبوت: <b>70%</b> من سعر الهدية (خصم 30%)\n\n` +
      'أمثلة عربية:\n' +
      '• <code>اهداء وردة</code> (بالرد على العضو)\n' +
      '• <code>اهداء وردة @user</code>\n' +
      '• <code>اهداء قصر @user 2</code>\n' +
      '• <code>شراء وردة 3</code>\n' +
      '• <code>شراء قصر</code>\n' +
      '• <code>بيع قصر 1</code>\n\n' +
      'مثال سلاش: <code>/ggift palace @user</code>',
      { parse_mode: 'HTML' }
    );
  }

  static async handleBuyGiftForSelfCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    if (args.length === 0) {
      return ctx.reply('❌ اكتب اسم الهدية أولاً.\nمثال: شراء وردة 2');
    }

    const qtyArg = [...args].reverse().find((x) => /^\d+$/.test(String(x))) || '1';
    const qty = Math.max(1, Math.min(20, parseInt(qtyArg, 10) || 1));

    const rawInput = this.extractGiftInputFromArgs(args);
    const giftTokens = rawInput ? rawInput.split(/\s+/) : [];
    const gift = this.resolveGiftByInput(rawInput) || this.resolveGiftByInput(giftTokens[0]) || this.resolveGiftByInput(args[0]);
    if (!gift) return ctx.reply('❌ الهدية غير معروفة. استخدم /ggifts');

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    const totalPrice = gift.price * qty;
    if ((row.points || 0) < totalPrice) {
      return ctx.reply(
        `❌ فلوسك غير كافية.\n` +
        `• المطلوب: ${this.formatCurrency(totalPrice)}\n` +
        `• فلوسك الآن: ${this.formatCurrency(row.points || 0)}`,
        {
        parse_mode: 'HTML',
        reply_to_message_id: ctx.message?.message_id
        }
      );
    }

    row.points = (row.points || 0) - totalPrice;
    this.upsertGiftInventory(row, gift, qty);
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    const mention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');
    return ctx.reply(
      `${mention}\n` +
      `✅ <b>تم شراء الهدية لنفسك</b>\n` +
      `• الهدية: ${gift.name}\n` +
      `• العدد: ${qty}\n` +
      `• التكلفة: ${this.formatCurrency(totalPrice)}\n` +
      `• فلوسك الآن: ${this.formatCurrency(row.points || 0)}`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static async handleSellGiftCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    if (args.length === 0) {
      return ctx.reply('❌ اكتب اسم الهدية التي تريد بيعها.\nمثال: بيع وردة 2');
    }

    const qtyArg = [...args].reverse().find((x) => /^\d+$/.test(String(x))) || '1';
    const qty = Math.max(1, Math.min(20, parseInt(qtyArg, 10) || 1));

    const rawInput = this.extractGiftInputFromArgs(args);
    const giftTokens = rawInput ? rawInput.split(/\s+/) : [];
    const gift = this.resolveGiftByInput(rawInput) || this.resolveGiftByInput(giftTokens[0]) || this.resolveGiftByInput(args[0]);
    if (!gift) return ctx.reply('❌ الهدية غير معروفة. استخدم /ggifts');

    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    const userDoc = await this.ensureGlobalProfileAndSyncRow(row, ctx.from);
    const inventory = this.normalizeGiftInventoryList(row.giftInventory);
    const slot = inventory.find((g) => g.key === gift.key);
    const currentCount = Number(slot?.count || 0);
    if (currentCount < qty) {
      return ctx.reply(`❌ ما عندك كمية كافية من ${gift.name}. الموجود عندك: ${currentCount}.`, {
        reply_to_message_id: ctx.message?.message_id
      });
    }

    const sellUnitPrice = Math.max(1, Math.floor(gift.price * 0.7));
    const totalPayout = sellUnitPrice * qty;

    this.upsertGiftInventory(row, gift, -qty);
    row.points = (row.points || 0) + totalPayout;
    row.updatedAt = new Date();
    await group.save();
    await this.syncRowToGlobal(userDoc, row);

    const mention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');
    return ctx.reply(
      `${mention}\n` +
      `✅ <b>تم بيع الهدية للبوت</b>\n` +
      `• الهدية: ${gift.name}\n` +
      `• العدد المباع: ${qty}\n` +
      `• سعر القطعة بعد الخصم: ${this.formatCurrency(sellUnitPrice)}\n` +
      `• المبلغ المستلم: ${this.formatCurrency(totalPayout)}\n` +
      `• فلوسك الآن: ${this.formatCurrency(row.points || 0)}`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
    );
  }

  static async handleAssetsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
    await this.ensureGlobalProfileAndSyncRow(row, ctx.from);

    const inventory = this.normalizeGiftInventoryList(row.giftInventory);
    row.giftInventory = inventory;
    row.loungeInventory = this.normalizeLoungeInventory(row.loungeInventory || {});
    row.loungeState = this.normalizeLoungeState(row.loungeState || {});
    const normalizeName = (value) => this.normalizeText(String(value || '')).trim();
    const countByName = {};
    const countByKey = {};
    for (const item of inventory) {
      const key = normalizeName(item?.key || '');
      const nameKey = normalizeName(item?.name || '');
      const count = Number(item?.count || 0);
      if (key) countByKey[key] = (countByKey[key] || 0) + count;
      if (nameKey) countByName[nameKey] = (countByName[nameKey] || 0) + count;
    }
    const sumBy = (keys = [], names = []) => {
      const byKey = keys.reduce((sum, k) => sum + (countByKey[normalizeName(k)] || 0), 0);
      if (byKey > 0) return byKey;
      return names.reduce((sum, n) => sum + (countByName[normalizeName(n)] || 0), 0);
    };
    const assetsLines = [
      { label: 'وردة', keys: ['rose'], names: ['وردة', 'ورده', 'rose'] },
      { label: 'باقة ورود', keys: ['bouquet'], names: ['باقة ورود', 'باقه ورود', 'bouquet'] },
      { label: 'وجبة', keys: ['meal'], names: ['وجبة', 'وجبه', 'meal'] },
      { label: 'سيارة', keys: ['car'], names: ['سيارة', 'سياره', 'car'] },
      { label: 'بيت', keys: ['house'], names: ['بيت', 'house'] },
      { label: 'فيلا', keys: ['villa'], names: ['فيلا', 'villa'] },
      { label: 'قصر', keys: ['palace'], names: ['قصر', 'palace'] },
      { label: 'جزيرة', keys: ['island'], names: ['جزيرة', 'جزيره', 'island'] },
      { label: 'طيارة', keys: ['plane'], names: ['طيارة', 'طياره', 'plane'] },
      { label: 'ماسة', keys: ['diamond'], names: ['ماسة', 'ماسه', 'diamond'] },
      { label: 'برج', keys: ['tower'], names: ['برج', 'tower'] },
      { label: 'مدينة', keys: ['city'], names: ['مدينة', 'مدينه', 'city'] },
      { label: 'سفينة سياحة', keys: ['cruise'], names: ['سفينة سياحة', 'سفينه سياحه', 'سفينة', 'سفينه', 'cruise'] },
      { label: 'هدية بابا نويل', keys: ['santa'], names: ['هدية بابا نويل', 'هديه بابا نويل', 'santa'] }
    ];
    const knownKeys = new Set(assetsLines.flatMap((x) => x.keys || []).map((k) => normalizeName(k)));
    const dynamicExtraLines = inventory
      .filter((x) => Number(x?.count || 0) > 0 && !knownKeys.has(normalizeName(x?.key || '')))
      .map((x) => `( ${x?.name || x?.key} ↤︎ ${Number(x?.count || 0)} )`);
    const rowsText = [
      ...assetsLines.map((x) => `( ${x.label} ↤︎ ${sumBy(x.keys, x.names)} )`),
      ...dynamicExtraLines
    ].join('\n');
    const loungeRows = [
      `( قهوة ↤︎ ${row.loungeInventory.coffee || 0} )`,
      `( شاي ↤︎ ${row.loungeInventory.tea || 0} )`,
      `( عصير ↤︎ ${row.loungeInventory.juice || 0} )`,
      `( عصير موهيتو ↤︎ ${row.loungeInventory.mojito || 0} )`,
      `( عصير برتقال ↤︎ ${row.loungeInventory.orange_juice || 0} )`,
      `( عصير ليمون ↤︎ ${row.loungeInventory.lemon_juice || 0} )`,
      `( عصير فواكه ↤︎ ${row.loungeInventory.fruit_juice || 0} )`,
      `( عصير موز ↤︎ ${row.loungeInventory.banana_juice || 0} )`,
      `( عصير افوكادو ↤︎ ${row.loungeInventory.avocado_juice || 0} )`,
      `( عصير فراولة ↤︎ ${row.loungeInventory.strawberry_juice || 0} )`,
      `( عصير مانجا ↤︎ ${row.loungeInventory.mango_juice || 0} )`,
      `( سفن أب ↤︎ ${row.loungeInventory.seven_up || 0} )`,
      `( كوكاكولا ↤︎ ${row.loungeInventory.cola || 0} )`,
      `( ماريندا ↤︎ ${row.loungeInventory.mirinda || 0} )`,
      `( نسكفيه ↤︎ ${row.loungeInventory.nescafe || 0} )`,
      `( كابتشينو ↤︎ ${row.loungeInventory.cappuccino || 0} )`,
      `( شاي لاتيه ↤︎ ${row.loungeInventory.chai_latte || 0} )`,
      `( هوت شوكليت ↤︎ ${row.loungeInventory.hot_chocolate || 0} )`,
      `( سيجارة ↤︎ ${row.loungeInventory.cigarette || 0} )`,
      `( سيجار ↤︎ ${row.loungeInventory.cigar || 0} )`,
      `( فيب ↤︎ ${row.loungeInventory.vape || 0} )`,
      `( ارجيلة ↤︎ ${row.loungeInventory.hookah || 0} )`,
      `( راس ارجيلة ↤︎ ${row.loungeInventory.hookah_head || 0} )`,
      `( فحم ↤︎ ${row.loungeInventory.coal || 0} )`,
      `( معسل تفاح ↤︎ ${row.loungeInventory.molasses_apple || 0} )`,
      `( معسل نعناع ↤︎ ${row.loungeInventory.molasses_mint || 0} )`,
      `( سائل فيب ↤︎ ${row.loungeInventory.vape_liquid || 0} )`,
      `( قداحة ↤︎ ${row.loungeInventory.lighter || 0} )`,
      `( توليعات قداحة ↤︎ ${row.loungeInventory.lighterFuel || 0} )`
    ].join('\n');

    const totalItems = inventory.reduce((sum, x) => sum + Number(x?.count || 0), 0);
    const totalEstimatedValue = inventory.reduce((sum, x) => {
      const meta = UNIQUE_GIFTS.find((g) => g.key === x.key);
      return sum + (Number(meta?.price || 0) * Number(x?.count || 0));
    }, 0) + (
      (row.loungeInventory.cigarette || 0) * LOUNGE_PRODUCTS.cigarette.price +
      (row.loungeInventory.cigar || 0) * LOUNGE_PRODUCTS.cigar.price +
      (row.loungeInventory.vape || 0) * LOUNGE_PRODUCTS.vape.price +
      (row.loungeInventory.hookah || 0) * LOUNGE_PRODUCTS.hookah.price +
      (row.loungeInventory.hookah_head || 0) * LOUNGE_PRODUCTS.hookah_head.price +
      (row.loungeInventory.coal || 0) * LOUNGE_PRODUCTS.coal.price +
      (row.loungeInventory.molasses_apple || 0) * LOUNGE_PRODUCTS.molasses_apple.price +
      (row.loungeInventory.molasses_mint || 0) * LOUNGE_PRODUCTS.molasses_mint.price +
      (row.loungeInventory.vape_liquid || 0) * LOUNGE_PRODUCTS.vape_liquid.price +
      (row.loungeInventory.coffee || 0) * LOUNGE_PRODUCTS.coffee.price +
      (row.loungeInventory.tea || 0) * LOUNGE_PRODUCTS.tea.price +
      (row.loungeInventory.juice || 0) * LOUNGE_PRODUCTS.juice.price +
      (row.loungeInventory.mojito || 0) * LOUNGE_PRODUCTS.mojito.price +
      (row.loungeInventory.orange_juice || 0) * LOUNGE_PRODUCTS.orange_juice.price +
      (row.loungeInventory.lemon_juice || 0) * LOUNGE_PRODUCTS.lemon_juice.price +
      (row.loungeInventory.fruit_juice || 0) * LOUNGE_PRODUCTS.fruit_juice.price +
      (row.loungeInventory.banana_juice || 0) * LOUNGE_PRODUCTS.banana_juice.price +
      (row.loungeInventory.avocado_juice || 0) * LOUNGE_PRODUCTS.avocado_juice.price +
      (row.loungeInventory.strawberry_juice || 0) * LOUNGE_PRODUCTS.strawberry_juice.price +
      (row.loungeInventory.mango_juice || 0) * LOUNGE_PRODUCTS.mango_juice.price +
      (row.loungeInventory.seven_up || 0) * LOUNGE_PRODUCTS.seven_up.price +
      (row.loungeInventory.cola || 0) * LOUNGE_PRODUCTS.cola.price +
      (row.loungeInventory.mirinda || 0) * LOUNGE_PRODUCTS.mirinda.price +
      (row.loungeInventory.nescafe || 0) * LOUNGE_PRODUCTS.nescafe.price +
      (row.loungeInventory.cappuccino || 0) * LOUNGE_PRODUCTS.cappuccino.price +
      (row.loungeInventory.chai_latte || 0) * LOUNGE_PRODUCTS.chai_latte.price +
      (row.loungeInventory.hot_chocolate || 0) * LOUNGE_PRODUCTS.hot_chocolate.price +
      (row.loungeInventory.lighter || 0) * LOUNGE_PRODUCTS.lighter.price
    );

    const activeBoost = row.activeBoost?.expiresAt && new Date(row.activeBoost.expiresAt).getTime() > Date.now()
      ? `✅ ${row.activeBoost.multiplier || 1}x حتى ${new Date(row.activeBoost.expiresAt).toLocaleString('ar-EG')}`
      : '❌ غير مفعل';

    await group.save();
    return ctx.reply(
      `📦 <b>أهلاً بك في قائمة ممتلكاتك</b>\n\n` +
      `${rowsText}\n\n` +
      `🪩 <b>قسم اللاونج</b>\n` +
      `${loungeRows}\n\n` +
      `🏷️ اللقب الحالي: ${row.title || 'مبتدئ'}\n` +
      `🚀 المعزز النشط: ${activeBoost}\n` +
      `🎁 إجمالي الهدايا: ${totalItems}\n` +
      `💎 القيمة التقديرية: ${this.formatCurrency(totalEstimatedValue)}\n\n` +
      `💡 للزيادة: استخدم /ggift أو /gbuygift أو "شراء [اسم الهدية]" أو "بيع [اسم الهدية]"`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleGiftCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    if (args.length === 0) return this.handleGiftCatalogCommand(ctx);

    const noiseWords = new Set(['الى', 'إلى', 'ل', 'for', 'to', 'x', '×', 'هدية', 'هديه']);
    const compact = args.filter((x) => !noiseWords.has(String(x)));
    const gift = this.resolveGiftByInput(compact[0] || args[0]);
    if (!gift) return ctx.reply('❌ الهدية غير معروفة. استخدم /ggifts');

    const targetArg = compact.find((x) => String(x).startsWith('@') || /^\d+$/.test(String(x))) || null;
    const qtyArg = compact.find((x) => /^\d+$/.test(String(x))) || '1';
    const qty = Math.max(1, Math.min(20, parseInt(qtyArg, 10) || 1));

    const group = await this.ensureGroupRecord(ctx);
    const target = this.resolveTargetUser(ctx, group, targetArg);
    if (!target?.id) return ctx.reply('❌ حدد العضو بالرد أو @username.');
    if (Number(target.id) === Number(ctx.from.id)) return ctx.reply('❌ لا يمكن إهداء هدية لنفسك.');

    const senderRow = this.getOrCreateScoreRow(group, ctx.from);
    const receiverRow = this.getOrCreateScoreRow(group, { id: target.id, username: target.username, first_name: target.first_name });
    const senderDoc = await this.ensureGlobalProfileAndSyncRow(senderRow, ctx.from);
    const receiverDoc = await this.ensureGlobalProfileAndSyncRow(receiverRow, { id: target.id, username: target.username, first_name: target.first_name });
    const totalPrice = gift.price * qty;
    if ((senderRow.points || 0) < totalPrice) return ctx.reply(`❌ رصيدك غير كافٍ. المطلوب ${this.formatCurrency(totalPrice)}.`);

    senderRow.points -= totalPrice;
    senderRow.giftsSent = (senderRow.giftsSent || 0) + qty;
    receiverRow.giftsReceived = (receiverRow.giftsReceived || 0) + qty;

    this.upsertGiftInventory(receiverRow, gift, qty);
    receiverRow.points = (receiverRow.points || 0) + Math.max(1, Math.floor(gift.price / 3)) * qty;
    this.awardXp(receiverRow, qty);

    await group.save();
    await this.syncRowToGlobal(senderDoc, senderRow);
    await this.syncRowToGlobal(receiverDoc, receiverRow);

    // Notify recipient privately when possible.
    if (this.bot && Number(target.id) > 0) {
      const senderName = ctx.from.first_name || ctx.from.username || String(ctx.from.id);
      this.bot.telegram.sendMessage(
        Number(target.id),
        `🎁 وصلك إهداء جديد من ${senderName}\n\n` +
        `الهدية: ${gift.name} ×${qty}\n` +
        `من جروب: ${ctx.chat?.title || 'جروب'}\n` +
        `رصيدك زاد +${this.formatCurrency(Math.max(1, Math.floor(gift.price / 3)) * qty)}\n\n` +
        'افتح البوت ثم ارجع للجروب إذا ما وصلك الإشعار.',
        { parse_mode: 'HTML' }
      ).catch(() => {});
    }

    const senderMention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');
    const receiverMention = this.mentionUser(target.id, target.first_name || target.username || String(target.id));
    return ctx.reply(
      `🎁 <b>عملية اهداء</b>\n\n` +
      `• الاهداء من : ${senderMention}\n` +
      `• نوع الهدية : ${gift.name}\n` +
      `• عدد : ${qty}\n` +
      `• المستلم : ${receiverMention}\n` +
      `• تكلفة الاهداء : ${this.formatCurrency(totalPrice)}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleWealthCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const scores = Array.isArray(group.gameSystem?.scores) ? group.gameSystem.scores : [];
    const top = scores
      .map((row) => {
        const value = (row.giftInventory || []).reduce((sum, g) => {
          const meta = UNIQUE_GIFTS.find((x) => x.key === g.key);
          return sum + (Number(meta?.price || 0) * Number(g.count || 0));
        }, 0);
        return { row, value };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    if (top.length === 0 || top.every((x) => x.value <= 0)) {
      return ctx.reply('📦 لا توجد ممتلكات كافية بعد. ابدأوا بالإهداء عبر /ggift');
    }

    const lines = top.map((x, i) => {
      const u = x.row;
      const mention = this.mentionUser(u.userId, u.username || `عضو ${u.userId}`);
      const giftsCount = (u.giftInventory || []).reduce((sum, g) => sum + Number(g.count || 0), 0);
      return `${i + 1}. ${mention} — ${this.formatCurrency(x.value)} (${giftsCount} هدية)`;
    });

    return ctx.reply(
      `💎 <b>لوحة أغنى ممتلكات الجروب</b>\n\n${lines.join('\n')}\n\n` +
      '💡 تعتمد اللوحة على قيمة مخزون الهدايا فقط.',
      { parse_mode: 'HTML' }
    );
  }


  static async handleDuelCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const status = await this.canStartRound(ctx);
    if (!status.ok) return;

    const group = status.group;
    const args = this.parseCommandArgs(ctx);
    const targetArg = args.find((x) => String(x).startsWith('@') || /^\d+$/.test(String(x))) || null;
    const target = this.resolveTargetUser(ctx, group, targetArg);
    if (!target?.id) return ctx.reply('❌ ابدأ التحدي بالرد على العضو أو بكتابة @username.');
    if (Number(target.id) === Number(ctx.from.id)) return ctx.reply('❌ لا يمكنك تحدي نفسك.');

    const key = String(ctx.chat.id);
    const old = this.activeDuelByChat.get(key);
    if (old) this.activeDuels.delete(old);

    const token = this.token('duel');
    this.activeDuelByChat.set(key, token);
    this.activeDuels.set(token, {
      token,
      chatId: key,
      challengerId: Number(ctx.from.id),
      challengerName: ctx.from.first_name || ctx.from.username || String(ctx.from.id),
      targetId: Number(target.id),
      targetName: target.first_name || target.username || String(target.id),
      createdAt: Date.now()
    });

    const kb = Markup.inlineKeyboard([[
      Markup.button.callback('✅ قبول التحدي', `group:duel:accept:${token}`),
      Markup.button.callback('❌ رفض', `group:duel:decline:${token}`)
    ]]);
    return ctx.reply(
      `⚔️ <b>تحدي عضوين</b>\n\n${ctx.from.first_name || 'لاعب'} تحدّى ${target.first_name || 'لاعب'}\n` +
      `الرابح يأخذ ${this.formatCurrency(DUEL_STAKE)} من الخاسر.\n` +
      'بانتظار القبول...',
      { parse_mode: 'HTML', reply_markup: kb.reply_markup }
    );
  }

  static async handleDuelAction(ctx, action, token) {
    if (!this.isGroupChat(ctx)) return;
    const duel = this.activeDuels.get(token);
    if (!duel) return ctx.answerCbQuery('انتهى التحدي.', { show_alert: false }).catch(() => {});
    if (String(ctx.chat.id) !== String(duel.chatId)) return ctx.answerCbQuery('تحدي لجروب آخر.', { show_alert: false }).catch(() => {});
    if (Number(ctx.from.id) !== Number(duel.targetId)) return ctx.answerCbQuery('فقط العضو المتحدّى يقدر يقرر.', { show_alert: false }).catch(() => {});

    if (action === 'decline') {
      this.activeDuels.delete(token);
      if (this.activeDuelByChat.get(String(ctx.chat.id)) === token) this.activeDuelByChat.delete(String(ctx.chat.id));
      await ctx.answerCbQuery('تم رفض التحدي', { show_alert: false }).catch(() => {});
      return ctx.reply(`❌ ${duel.targetName} رفض التحدي.`);
    }

    await ctx.answerCbQuery('تم القبول', { show_alert: false }).catch(() => {});
    this.activeDuels.delete(token);
    if (this.activeDuelByChat.get(String(ctx.chat.id)) === token) this.activeDuelByChat.delete(String(ctx.chat.id));

    const q = this.pickFromQueue(QUICK_QUESTIONS, `duel:${String(ctx.chat.id)}`);
    return this.startRoundInternal(ctx.chat.id, {
      type: 'duel',
      prompt: `⚔️ <b>تحدي مباشر</b>\n\n${duel.challengerName} vs ${duel.targetName}\n\n${q.question}`,
      answers: q.answers,
      reward: 1,
      timeoutSec: 20,
      allowedUserIds: [duel.challengerId, duel.targetId],
      onWin: async ({ group, winnerId }) => {
        const loserId = Number(winnerId) === Number(duel.challengerId) ? Number(duel.targetId) : Number(duel.challengerId);
        const loserRow = group.gameSystem.scores.find((s) => Number(s.userId) === loserId);
        const winnerRow = group.gameSystem.scores.find((s) => Number(s.userId) === Number(winnerId));
        const stolen = Math.max(0, Math.min(DUEL_STAKE, loserRow?.points || 0));
        if (stolen > 0) {
          loserRow.points = (loserRow.points || 0) - stolen;
          winnerRow.points = (winnerRow.points || 0) + stolen;
          if (loserRow && winnerRow) {
            const loserDoc = await this.ensureGlobalProfileAndSyncRow(
              loserRow,
              { id: loserId, username: loserRow.username, first_name: loserRow.username }
            );
            const winnerDoc = await this.ensureGlobalProfileAndSyncRow(
              winnerRow,
              { id: Number(winnerId), username: winnerRow.username, first_name: winnerRow.username }
            );
            await this.syncRowToGlobal(loserDoc, loserRow);
            await this.syncRowToGlobal(winnerDoc, winnerRow);
          }
        }
      }
    }, false);
  }

  static buildConfessionKeyboard(token) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🛑 إنهاء كرسي الاعتراف', `group:confess:end:${token}`)]
    ]);
  }

  static getActiveConfession(chatId) {
    const key = String(chatId);
    const session = this.activeConfessions.get(key);
    if (!session) return null;
    if (Date.now() > Number(session.endsAt || 0)) {
      this.activeConfessions.delete(key);
      this.confessionQuestions.delete(session.token);
      return null;
    }
    return session;
  }

  static async handleConfessionStart(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const chatId = String(ctx.chat.id);
    const running = this.getActiveConfession(chatId);
    if (running) {
      return ctx.reply(
        `⏳ فيه كرسي اعتراف شغال حاليًا مع ${this.mentionUser(running.chairUserId, running.chairName)}.\n` +
        'إذا بدكم تنهوه اكتبوا: انهاء كرسي الاعتراف',
        { parse_mode: 'HTML' }
      );
    }

    const target = ctx.message?.reply_to_message?.from;
    if (!target || target.is_bot) {
      return ctx.reply('❌ البداية تكون بالرد على رسالة الشخص.\nمثال: رد على رسالته واكتب "كرسي الاعتراف".');
    }

    const token = this.token('cf');
    const chairName = target.first_name || target.username || String(target.id);
    const ownerName = ctx.from?.first_name || ctx.from?.username || String(ctx.from?.id || '');
    const durationMin = 12;
    const endsAt = Date.now() + durationMin * 60 * 1000;

    const msg = await ctx.reply(
      `🎤 <b>كرسي الاعتراف بدأ</b>\n\n` +
      `• صاحب الكرسي: ${this.mentionUser(target.id, chairName)}\n` +
      `• المدة: ${durationMin} دقيقة\n\n` +
      '📝 طريقة اللعب:\n' +
      '1) أي عضو يسأل بس <b>بالرد على هذه الرسالة</b>.\n' +
      `2) صاحب الكرسي يجاوب بالرد على السؤال.\n` +
      '3) لإنهاء الجلسة: زر الإنهاء أو "انهاء كرسي الاعتراف".',
      { parse_mode: 'HTML', reply_markup: this.buildConfessionKeyboard(token).reply_markup }
    );

    this.activeConfessions.set(chatId, {
      token,
      chatId,
      ownerUserId: Number(ctx.from.id),
      ownerName,
      chairUserId: Number(target.id),
      chairName,
      anchorMessageId: Number(msg.message_id),
      startedAt: Date.now(),
      endsAt
    });
    this.confessionQuestions.set(token, new Map());
  }

  static async handleConfessionEnd(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const session = this.getActiveConfession(ctx.chat.id);
    if (!session) return ctx.reply('ℹ️ ما في كرسي اعتراف شغال حاليًا.');

    const isAdmin = await this.isGroupAdmin(ctx);
    const uid = Number(ctx.from?.id || 0);
    const allowed = isAdmin || uid === Number(session.ownerUserId) || uid === Number(session.chairUserId);
    if (!allowed) {
      return ctx.reply('❌ فقط المشرف أو اللي بدأ الجلسة أو صاحب الكرسي يقدر ينهيها.');
    }
    return this.finishConfessionSession(ctx, session, 'manual');
  }

  static async finishConfessionSession(ctx, session, reason = 'manual') {
    this.activeConfessions.delete(String(session.chatId));
    const qmap = this.confessionQuestions.get(session.token) || new Map();
    this.confessionQuestions.delete(session.token);
    const total = qmap.size;
    const answered = Array.from(qmap.values()).filter((x) => Boolean(x.answered)).length;
    const durationMin = Math.max(1, Math.round((Date.now() - Number(session.startedAt || Date.now())) / 60000));
    const reasonText = reason === 'expired' ? '⏰ انتهى وقت الجلسة تلقائيًا.' : '✅ تم إنهاء الجلسة.';

    return ctx.reply(
      `🪑 <b>انتهى كرسي الاعتراف</b>\n\n` +
      `${reasonText}\n` +
      `• صاحب الكرسي: ${this.mentionUser(session.chairUserId, session.chairName)}\n` +
      `• مدة الجلسة: ${durationMin} دقيقة\n` +
      `• عدد الأسئلة: ${total}\n` +
      `• الأسئلة المُجاب عنها: ${answered}`,
      { parse_mode: 'HTML' }
    );
  }

  static async handleConfessionAction(ctx, action, token) {
    if (!this.isGroupChat(ctx)) return;
    await ctx.answerCbQuery().catch(() => {});
    const session = this.getActiveConfession(ctx.chat.id);
    if (!session || session.token !== token) {
      return ctx.reply('ℹ️ جلسة كرسي الاعتراف هذه انتهت.');
    }
    if (action !== 'end') return;

    const isAdmin = await this.isGroupAdmin(ctx);
    const uid = Number(ctx.from?.id || 0);
    const allowed = isAdmin || uid === Number(session.ownerUserId) || uid === Number(session.chairUserId);
    if (!allowed) {
      return ctx.reply('❌ فقط المشرف أو اللي بدأ الجلسة أو صاحب الكرسي يقدر ينهيها.');
    }
    return this.finishConfessionSession(ctx, session, 'manual');
  }

  static async handleIncomingConfessionText(ctx, text) {
    if (!this.isGroupChat(ctx)) return false;
    const session = this.getActiveConfession(ctx.chat.id);
    if (!session) return false;

    if (Date.now() > Number(session.endsAt || 0)) {
      await this.finishConfessionSession(ctx, session, 'expired');
      return true;
    }

    const message = ctx.message || {};
    const uid = Number(ctx.from?.id || 0);
    const replyToId = Number(message?.reply_to_message?.message_id || 0);
    const token = session.token;
    const qmap = this.confessionQuestions.get(token) || new Map();
    this.confessionQuestions.set(token, qmap);

    const askText = String(text || '').trim();
    const normalized = this.normalizeText(askText);

    // Any member asks by replying to the session anchor message
    if (replyToId && replyToId === Number(session.anchorMessageId)) {
      if (uid === Number(session.chairUserId)) {
        await ctx.reply('ℹ️ أنت صاحب الكرسي. للجواب رد على سؤال العضو مباشرة.');
        return true;
      }
      if (!askText || askText.length < 2) {
        await ctx.reply('❌ اكتب سؤال واضح.');
        return true;
      }
      qmap.set(Number(message.message_id), {
        askerId: uid,
        askerName: ctx.from?.first_name || ctx.from?.username || String(uid),
        questionText: askText,
        answered: false
      });
      await ctx.reply(
        `✅ تم تسجيل السؤال لـ ${this.mentionUser(session.chairUserId, session.chairName)}.\n` +
        'صاحب الكرسي يجاوب بالرد على نفس السؤال.',
        { parse_mode: 'HTML', reply_to_message_id: Number(message.message_id) }
      );
      return true;
    }

    // Chair answers by replying to a stored question
    if (replyToId && uid === Number(session.chairUserId) && qmap.has(replyToId)) {
      const q = qmap.get(replyToId);
      if (q.answered) {
        await ctx.reply('ℹ️ هذا السؤال مجاوب عليه مسبقًا.', { reply_to_message_id: Number(message.message_id) });
        return true;
      }
      q.answered = true;
      q.answerText = askText;
      q.answeredAt = Date.now();
      qmap.set(replyToId, q);

      await ctx.reply(
        `💬 <b>جواب كرسي الاعتراف</b>\n` +
        `• السؤال من: ${this.mentionUser(q.askerId, q.askerName)}\n` +
        `• الجواب: ${askText}`,
        { parse_mode: 'HTML', reply_to_message_id: Number(message.message_id) }
      );
      return true;
    }

    // Optional short command format while a session is active
    if (/^(?:سؤال\s+اعتراف|سؤال)\b/.test(normalized) && uid !== Number(session.chairUserId)) {
      const pure = askText.replace(/^(?:سؤال\s+اعتراف|سؤال)\s*/i, '').trim();
      if (!pure) {
        await ctx.reply('❌ اكتب السؤال بعد كلمة "سؤال". مثال: سؤال ليش بتحب البرمجة؟');
        return true;
      }
      qmap.set(Number(message.message_id), {
        askerId: uid,
        askerName: ctx.from?.first_name || ctx.from?.username || String(uid),
        questionText: pure,
        answered: false
      });
      await ctx.reply(
        `✅ تم تسجيل السؤال لـ ${this.mentionUser(session.chairUserId, session.chairName)}.`,
        { parse_mode: 'HTML', reply_to_message_id: Number(message.message_id) }
      );
      return true;
    }

    return false;
  }

  static async handleMonthlyRewardCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const currentMonth = this.getMonthKey();
    if (group.gameSystem.state.lastMonthlyRewardKey === currentMonth) {
      return ctx.reply('ℹ️ تم صرف مكافأة هذا الشهر بالفعل.');
    }

    const rows = [...(group.gameSystem.scores || [])]
      .sort((a, b) => (b.monthlyPoints || 0) - (a.monthlyPoints || 0))
      .slice(0, 3);
    if (rows.length === 0) return ctx.reply('📊 لا توجد نتائج شهرية بعد.');

    rows.forEach((r, i) => {
      const bonus = MONTHLY_REWARDS[i] || 0;
      r.points = (r.points || 0) + bonus;
      r.monthlyPoints = 0;
      this.awardXp(r, Math.floor(bonus / 2));
      r.updatedAt = new Date();
    });
    await Promise.all(rows.map(async (r) => {
      const userDoc = await this.ensureGlobalProfileAndSyncRow(
        r,
        { id: Number(r.userId), username: r.username, first_name: r.username }
      );
      await this.syncRowToGlobal(userDoc, r);
    }));
    group.gameSystem.state.lastMonthlyRewardKey = currentMonth;
    await group.save();

    let text = '🎁 <b>المكافأة الشهرية</b>\n\n';
    rows.forEach((r, i) => {
      text += `${i + 1}. ${r.username || r.userId} — +${this.formatCurrency(MONTHLY_REWARDS[i] || 0)}\n`;
    });
    return ctx.reply(text, { parse_mode: 'HTML' });
  }

  static async handleTierRewardsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const isAdmin = await this.isGroupAdmin(ctx);
    if (!isAdmin) return ctx.reply('❌ هذا الأمر للمشرفين فقط.');

    const group = await this.ensureGroupRecord(ctx);
    const args = this.parseCommandArgs(ctx);
    const current = this.getTierUpRewards(group);
    const numeric = args.map((x) => parseInt(String(x), 10)).filter((n) => Number.isInteger(n));

    if (numeric.length < 4) {
      return ctx.reply(
        '🏅 <b>مكافآت الترقية الحالية</b>\n\n' +
        `الفضي: +${current.silver}\n` +
        `الذهبي: +${current.gold}\n` +
        `البلاتيني: +${current.platinum}\n` +
        `الماسي: +${current.diamond}\n\n` +
        'للتعديل:\n' +
        '<code>/gbonus 10 20 35 60</code>\n' +
        'أو: <code>مكافآت المستوى 10 20 35 60</code>',
        { parse_mode: 'HTML' }
      );
    }

    const [silver, gold, platinum, diamond] = numeric.slice(0, 4);
    const valid = [silver, gold, platinum, diamond].every((n) => Number.isInteger(n) && n >= 0);
    if (!valid) return ctx.reply('❌ القيم يجب أن تكون أرقامًا صحيحة غير سالبة.');
    if (!(silver <= gold && gold <= platinum && platinum <= diamond)) {
      return ctx.reply('❌ يجب أن تكون القيم تصاعدية: فضي ≤ ذهبي ≤ بلاتيني ≤ ماسي.');
    }

    group.settings = group.settings || {};
    group.settings.tierUpRewards = { silver, gold, platinum, diamond };
    await group.save();

    return ctx.reply(
      '✅ تم تحديث مكافآت الترقية:\n' +
      `الفضي +${silver} | الذهبي +${gold} | البلاتيني +${platinum} | الماسي +${diamond}`
    );
  }

  static async handleGamesMenuAction(ctx, action) {
    if (!this.isGroupChat(ctx)) return;
    if (this.checkCooldown(ctx, `menu:${action}`, 1200)) {
      if (ctx.callbackQuery) await ctx.answerCbQuery('تمهّل ثانية...', { show_alert: false }).catch(() => {});
      return;
    }
    if (ctx.callbackQuery) await ctx.answerCbQuery().catch(() => {});

    if (action === 'gquiz') return this.handleQuizCommand(ctx);
    if (action === 'gmath') return this.handleMathCommand(ctx);
    if (action === 'gword') return this.handleWordCommand(ctx);
    if (action === 'gwho') return this.handleWhoAmICommand(ctx);
    if (action === 'griddle') return this.handleRiddleCommand(ctx);
    if (action === 'gtype') return this.handleTypingCommand(ctx);
    if (action === 'gduel') return this.handleDuelCommand(ctx);
    if (action === 'gchance') return this.handleChanceCommand(ctx);
    if (action === 'gdaily') return this.handleDailyCommand(ctx);
    if (action === 'gmcq') return this.handleMcqCommand(ctx);
    if (action === 'gvote') return this.handleVoteCommand(ctx);
    if (action === 'gleader') return this.handleLeaderCommand(ctx);
    if (action === 'gweekly') return this.handleWeeklyCommand(ctx);
    if (action === 'gmonth') return this.handleMonthlyBoardCommand(ctx);
    if (action === 'glevels') return this.handleLevelsCommand(ctx);
    if (action === 'glounge') return this.handleLoungeMenuCommand(ctx);
    if (action === 'gconfess') return this.handleConfessionStart(ctx);
    if (action === 'gconfess_end') return this.handleConfessionEnd(ctx);
    return null;
  }

  static async handleGamesHelp(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('❓ سؤال سريع', 'group:games:gquiz'), Markup.button.callback('🗳️ اختيارات', 'group:games:gmcq')],
      [Markup.button.callback('➗ حساب ذهني', 'group:games:gmath'), Markup.button.callback('🔤 ترتيب كلمة', 'group:games:gword')],
      [Markup.button.callback('🎯 مين أنا', 'group:games:gwho'), Markup.button.callback('🧠 ألغاز', 'group:games:griddle')],
      [Markup.button.callback('⚡ سرعة الكتابة', 'group:games:gtype'), Markup.button.callback('⚔️ تحدي عضوين', 'group:games:gduel')],
      [Markup.button.callback('🎲 روليت', 'group:games:gchance'), Markup.button.callback('📊 تصويت', 'group:games:gvote')],
      [Markup.button.callback('🪑 كرسي الاعتراف', 'group:games:gconfess'), Markup.button.callback('🧠 تحدي يومي', 'group:games:gdaily')],
      [Markup.button.callback('🏁 المتصدرين', 'group:games:gleader'), Markup.button.callback('📅 سباق الأسبوع', 'group:games:gweekly')],
      [Markup.button.callback('🗓️ سباق الشهر', 'group:games:gmonth'), Markup.button.callback('🏅 لوحة المستويات', 'group:games:glevels')],
      [Markup.button.callback('🪩 لاونج', 'group:games:glounge'), Markup.button.callback('🧰 مستلزماتي', 'group:quick:supplies')],
      [Markup.button.callback('🛑 إنهاء كرسي الاعتراف', 'group:games:gconfess_end')]
    ]);
    return ctx.reply(
      '🎮 <b>مساعدة ألعاب الجروب (موحّدة)</b>\n\n' +
      '<b>أولًا: الأوامر السريعة</b>\n' +
      '• /gquiz | سؤال سريع\n' +
      '• /gmcq | سؤال اختيارات\n' +
      '• /gmath | حساب ذهني\n' +
      '• /gword | ترتيب كلمة\n' +
      '• /gwho | مين أنا\n' +
      '• /griddle | ألغاز\n' +
      '• /gtype | سرعة الكتابة\n' +
      '• /chance | روليت\n' +
      '• /gduel @user | تحدي عضوين\n' +
      '• /gvote | تصويت\n' +
      '• /gconfess (بالرد) | بدء كرسي الاعتراف\n' +
      '• /gconfessend | إنهاء كرسي الاعتراف\n' +
      '• /glounge | لاونج جو (الدخان/الأرجيلة)\n' +
      '• /gdaily | تحدي يومي\n\n' +
      '<b>ثانيًا: النظام والترتيب</b>\n' +
      '• /gleader | إجمالي المتصدرين\n' +
      '• /gweekly | سباق الأسبوع\n' +
      '• /gmonth | سباق الشهر\n' +
      '• /glevels | لوحة المستويات\n' +
      '• /gprofile | ملفك في الجروب\n' +
      '• /ginvest | استثمار فلوسك\n' +
      '• /ggrantmoney 1000 @user | منح فلوس (للمالك)\n' +
      '• /gtakemoney 1000 @user | سحب فلوس (للمالك)\n' +
      '• /gluck | يبدأ اختيار رقم للحظ (1-1000)\n' +
      '• /gluckstats | إحصائيات الحظ\n' +
      '• /gmonthly | صرف المكافأة الشهرية (مشرف)\n' +
      '• /gbonus 10 20 35 60 | مكافآت الترقية (مشرف)\n\n' +
      '<b>ثالثًا: المتجر والهدايا</b>\n' +
      '• /gstore | متجر الجروب\n' +
      '• /gbuy key | شراء عنصر\n' +
      '• /ggifts | قائمة الهدايا\n' +
      '• /ggift key @user [count] | إهداء هدية\n' +
      '• /gbuygift key [count] | شراء هدية لنفسك\n' +
      '• /gsellgift key [count] | بيع هدية للبوت (70%)\n' +
      '• شراء [اسم الهدية] [عدد] | شراء عربي مبسط\n' +
      '• بيع [اسم الهدية] [عدد] | بيع عربي مبسط\n' +
      '• /gassets | ممتلكاتك في الجروب\n\n' +
      '<b>رابعًا: الكشط والربح</b>\n' +
      '• /gscratch [count] | كشط بطاقات (1-5)\n' +
      '• /gscratchstats | إحصائيات الكشط\n\n' +
      '<b>خامسًا: الثروة</b>\n' +
      '• /gwealth | لوحة أغنى ممتلكات\n' +
      '• استثمار فلوسي | استثمار مباشر\n\n' +
      '<b>سادسًا: لاونج جو</b>\n' +
      '• لاونج | عرض قائمة اللاونج\n' +
      '• كافيتيريا | قائمة الكافيتيريا\n' +
      '• شراء سيجارة 2 | شراء دخان\n' +
      '• شراء قهوة | شراء شاي | شراء نسكفيه | شراء كابتشينو | شراء شاي لاتيه\n' +
      '• شراء هوت شوكليت\n' +
      '• شراء عصير موهيتو | شراء عصير برتقال | شراء عصير ليمون | شراء عصير فواكه | شراء عصير موز\n' +
      '• شراء عصير افوكادو | شراء عصير فراولة | شراء عصير مانجا\n' +
      '• شراء سفن اب | شراء كوكاكولا | شراء ماريندا\n' +
      '• اشرب قهوة | اشرب شاي | اشرب عصير موهيتو | اشرب برتقال | اشرب ليمون | اشرب فواكه | اشرب موز\n' +
      '• اشرب افوكادو | اشرب فراولة | اشرب مانجا | اشرب هوت شوكليت\n' +
      '• شراء قداحة | شرط للتوليع\n' +
      '• اشتغل بالكافيتيريا\n' +
      '• طلب كافيتيريا | سلم الطلب\n' +
      '• ولع سيجارة | ولع سيجار | شغل فيب | جهز ارجيلة\n' +
      '• هف | هفف | هففف | هفففف | هففففف\n' +
      '• افتح جلسة ارجيلة | انضم | نفس\n' +
      '• مستلزماتي | مزاجي\n' +
      '• توب الكافيتيريا | توب نفس ارجيلة | توب الدخان\n\n' +
      '<b>سابعًا: القلاع والحكام</b>\n' +
      '• انشاء قلعه | /gcastle\n' +
      '• قلعتي | /gmycastle\n' +
      '• متجر الموارد | /gresstore\n' +
      '• شراء موارد خشب 30 | /gbuyres wood 30\n' +
      '• مواردي | /gmyres\n' +
      '• تطوير قلعتي | /gupcastle\n' +
      '• انشاء معكسر | /gbarracks\n' +
      '• شراء جيش 500 | /gbuyarmy 500\n' +
      '• تطوير الجيش | /guparmy\n' +
      '• بحث الكنز | /gtreasure\n' +
      '• تفعيل/تعطيل الحصانه | /gshield\n' +
      '• حصانتي | /gmyshield\n' +
      '• مبارزه (بالرد) | /gwar\n' +
      '• الانضمام للمبارزه | /garena\n' +
      '• المبارزين | /gfighters\n' +
      '• توب الحكام | /grulers\n' +
      '• تحالف @user | /gally @user\n' +
      '• طلبات التحالف | /gallyreq\n\n' +
      '<b>ثامنًا: إدارة متقدمة</b>\n' +
      '• /ggame | إعدادات ألعاب الجروب\n' +
      '• /gquizset 5 | سلسلة كويز\n' +
      '• /gteam | فريقك\n' +
      '• /gteams | ترتيب الفرق\n' +
      '• /gtour | البطولة الأسبوعية (مشرف)\n\n' +
      '<b>أوامر عربية بدون سلاش</b>\n' +
      'العاب الجروب | مين انا | الغاز | سرعة الكتابة | روليت | متصدرين | اسبوعي | متصدرين الشهر | ملفي | متجر الجروب | الهدايا | ممتلكاتي | اغنى ممتلكات | استثمار فلوسي | حظ | احصائيات الحظ | كشط | احصائيات الكشط | كرسي الاعتراف | انهاء كرسي الاعتراف | انشاء قلعه | قلعتي | متجر الموارد | شراء موارد | مواردي | تطوير قلعتي | انشاء معكسر | شراء جيش | تطوير الجيش | بحث الكنز | تفعيل الحصانه | تعطيل الحصانه | حصانتي | مبارزه | الانضمام للمبارزه | المبارزين | توب الحكام | تحالف | طلبات التحالف\n\n' +
      `العملة: كل إجابة صحيحة = <b>${this.formatCurrency(1)}</b>.`,
      { parse_mode: 'HTML', reply_markup: keyboard.reply_markup }
    );
  }
}

module.exports = GroupGamesHandler;
