const Markup = require('telegraf/markup');
const { Group } = require('../database/models');

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
const LUCK_OVER_COUNT = 15;
const LUCK_GOOD_COUNT = 60;
const LUCK_SMALL_COUNT = 180;
const LUCK_PAYOUTS = { small: 10, good: 35, over: 100 };
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
  static lastQuestionByGroup = new Map();
  static questionQueues = new Map();
  static userCooldowns = new Map();
  static pendingLuckInputs = new Map();
  static luckDailyNumbersCache = null;

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
    });
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
    if (action === 'help') return this.handleGamesHelp(ctx);
    return null;
  }

  static async handleLevelsCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
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
      row = {
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
        wins: 0,
        streak: 0,
        bestStreak: 0,
        lastWinDate: null,
        updatedAt: new Date()
      };
      group.gameSystem.scores.push(row);
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
    return row;
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
    return UNIQUE_GIFTS.find((g) => {
      const extraAliases = {
        meal: ['وجبة', 'وجبه', 'meal'],
        island: ['جزيرة', 'جزيره', 'island'],
        plane: ['طيارة', 'طياره', 'plane'],
        diamond: ['ماسة', 'ماسه', 'diamond'],
        tower: ['برج', 'tower'],
        city: ['مدينة', 'مدينه', 'city'],
        cruise: ['سفينة سياحة', 'سفينه سياحه', 'سفينة', 'سفينه', 'cruise'],
        palace: ['قصر', 'palace'],
        house: ['بيت', 'house'],
        villa: ['فيلا', 'villa'],
        rose: ['وردة', 'ورده', 'rose'],
        bouquet: ['باقة ورود', 'باقه ورود', 'bouquet'],
        santa: ['هدية بابا نويل', 'هديه بابا نويل', 'santa'],
        car: ['سيارة', 'سياره', 'car']
      };
      const aliases = [g.key, g.name, this.normalizeText(g.name), ...(extraAliases[g.key] || [])];
      return aliases.some((x) => this.normalizeText(String(x)) === this.normalizeText(raw));
    }) || null;
  }

  static extractGiftInputFromArgs(args = []) {
    const noiseWords = new Set(['شراء', 'اشتري', 'بيع', 'ببيع', 'اهداء', 'إهداء', 'ارسال', 'إرسال', 'هدية', 'هديه', 'من', 'المتجر', 'لي', 'لنفسي', 'نفسي', 'x', '×']);
    const filtered = args.filter((x) => !noiseWords.has(this.normalizeText(String(x))) && !/^\d+$/.test(String(x)) && !String(x).startsWith('@'));
    return filtered.join(' ').trim();
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

    const over = new Set(numbers.slice(0, LUCK_OVER_COUNT));
    const good = new Set(numbers.slice(LUCK_OVER_COUNT, LUCK_OVER_COUNT + LUCK_GOOD_COUNT));
    const small = new Set(numbers.slice(LUCK_OVER_COUNT + LUCK_GOOD_COUNT, LUCK_OVER_COUNT + LUCK_GOOD_COUNT + LUCK_SMALL_COUNT));

    this.luckDailyNumbersCache = { key, over, good, small };
    return this.luckDailyNumbersCache;
  }

  static evaluateLuckNumber(number) {
    const pool = this.buildDailyLuckNumbers();
    if (pool.over.has(number)) return { tier: 'اوفر', win: true, payout: LUCK_PAYOUTS.over };
    if (pool.good.has(number)) return { tier: 'جيد', win: true, payout: LUCK_PAYOUTS.good };
    if (pool.small.has(number)) return { tier: 'قليل', win: true, payout: LUCK_PAYOUTS.small };
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
    this.resetLuckDailyIfNeeded(row);
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
    row.luckTotalPlays = Number(row.luckTotalPlays || 0) + 1;
    if (result.win) row.luckTotalWins = Number(row.luckTotalWins || 0) + 1;
    row.luckTotalPayout = Number(row.luckTotalPayout || 0) + winAmount;
    row.luckLastPlayAt = new Date();
    row.updatedAt = new Date();
    await group.save();

    const mention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');
    await ctx.reply(
      `${mention}\n` +
      `• ${result.win ? 'مبروك فزت بالحظ' : 'حظ أوفر المرة الجاية'}\n` +
      `• الرقم المختار ↢ ( ${pickedNumber} )\n` +
      `• مستوى الحظ ↢ ( ${result.tier} )\n` +
      `• فلوسك قبل ↢ ( ${this.formatCurrency(before)} )\n` +
      `• فلوسك الآن ↢ ( ${this.formatCurrency(row.points || 0)} )\n` +
      `• قيمة الحظ ↢ ( ${result.win ? '+' : ''}${this.formatCurrency(winAmount)} )\n` +
      `• محاولاتك اليوم ↢ ( ${row.luckPlaysToday}/${LUCK_DAILY_LIMIT} )`,
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

  static addRewardPointsToMember(group, userId, amount) {
    if (!amount || amount <= 0) return;
    let row = group.gameSystem.scores.find((s) => Number(s.userId) === Number(userId));
    if (!row) {
      row = {
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
      group.gameSystem.scores.push(row);
    }
    row.points = (row.points || 0) + amount;
    row.weeklyPoints = (row.weeklyPoints || 0) + amount;
    row.monthlyPoints = (row.monthlyPoints || 0) + amount;
    this.awardXp(row, amount);
    row.updatedAt = new Date();
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
      const isKnownCommandLike = /^(شراء|بيع|اهداء|إهداء|ارسال|إرسال|متجر|هدايا|ممتلكاتي|حظ)\b/i.test(normalized);
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
      top.forEach((team, idx) => {
        const bonus = rewards[idx] || 0;
        team.wins = (team.wins || 0) + 1;
        (team.members || []).forEach((memberId) => this.addRewardPointsToMember(group, memberId, bonus));
      });

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
    const pool = (group.gameSystem.scores || []).slice(0, 40);
    if (!pool.find((x) => Number(x.userId) === Number(ctx.from.id))) {
      this.getOrCreateScoreRow(group, ctx.from);
      await group.save();
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
    if (item.type === 'boost') {
      return ctx.reply(`✅ تم تفعيل ${item.title}.`);
    }
    return ctx.reply(`✅ تم شراء اللقب وتفعيله: ${item.title}`);
  }

  static async handleSimpleBuyCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const args = this.parseCommandArgs(ctx);
    if (args.length === 0) return this.handleStoreCommand(ctx);

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

  static async handleGroupProfileCommand(ctx) {
    if (!this.isGroupChat(ctx)) return;
    const group = await this.ensureGroupRecord(ctx);
    const row = this.getOrCreateScoreRow(group, ctx.from);
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
    const current = Math.max(0, Math.floor(Number(row.points || 0)));
    const mention = this.mentionUser(ctx.from?.id, ctx.from?.first_name || ctx.from?.username || 'عضو');

    if (current <= 0) {
      await group.save();
      return ctx.reply(`${mention}\n❌ ما عندك فلوس للاستثمار.\n• فلوسك ${this.formatCurrency(0)}`, { parse_mode: 'HTML' });
    }

    const rate = 10;
    const profit = Math.max(1, Math.floor(current * (rate / 100)));
    row.points = current + profit;
    row.updatedAt = new Date();
    await group.save();

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
      `• محاولاتك اليوم ↢ ( ${row.luckPlaysToday}/${LUCK_DAILY_LIMIT} )`,
      { parse_mode: 'HTML', reply_to_message_id: ctx.message?.message_id }
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
    let slot = (row.giftInventory || []).find((g) => g.key === gift.key);
    if (!slot) {
      slot = { key: gift.key, name: gift.name, count: 0 };
      row.giftInventory.push(slot);
    }
    slot.count = (slot.count || 0) + qty;
    row.updatedAt = new Date();
    await group.save();

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
    const inventory = Array.isArray(row.giftInventory) ? row.giftInventory : [];
    const slot = inventory.find((g) => g.key === gift.key);
    const currentCount = Number(slot?.count || 0);
    if (currentCount < qty) {
      return ctx.reply(`❌ ما عندك كمية كافية من ${gift.name}. الموجود عندك: ${currentCount}.`, {
        reply_to_message_id: ctx.message?.message_id
      });
    }

    const sellUnitPrice = Math.max(1, Math.floor(gift.price * 0.7));
    const totalPayout = sellUnitPrice * qty;

    slot.count = currentCount - qty;
    if (slot.count <= 0) {
      row.giftInventory = inventory.filter((g) => g !== slot);
    }
    row.points = (row.points || 0) + totalPayout;
    row.updatedAt = new Date();
    await group.save();

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

    const inventory = Array.isArray(row.giftInventory) ? row.giftInventory : [];
    const normalizeName = (value) => this.normalizeText(String(value || ''))
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .trim();
    const countByName = {};
    for (const item of inventory) {
      const key = normalizeName(item?.name || item?.key || '');
      if (!key) continue;
      countByName[key] = (countByName[key] || 0) + Number(item?.count || 0);
    }
    const sumNames = (names) => names.reduce((sum, n) => sum + (countByName[normalizeName(n)] || 0), 0);
    const assetsLines = [
      { label: 'وردة', names: ['وردة', 'ورده', 'rose'] },
      { label: 'باقة ورود', names: ['باقة ورود', 'باقه ورود', 'bouquet'] },
      { label: 'وجبة', names: ['وجبة', 'وجبه', 'meal'] },
      { label: 'سيارة', names: ['سيارة', 'سياره', 'car'] },
      { label: 'بيت', names: ['بيت', 'house'] },
      { label: 'فيلا', names: ['فيلا', 'villa'] },
      { label: 'قصر', names: ['قصر', 'palace'] },
      { label: 'جزيرة', names: ['جزيرة', 'جزيره', 'island'] },
      { label: 'طيارة', names: ['طيارة', 'طياره', 'plane'] },
      { label: 'ماسة', names: ['ماسة', 'ماسه', 'diamond'] },
      { label: 'برج', names: ['برج', 'tower'] },
      { label: 'مدينة', names: ['مدينة', 'مدينه', 'city'] },
      { label: 'سفينة سياحة', names: ['سفينة سياحة', 'سفينه سياحه', 'سفينة', 'سفينه', 'cruise'] },
      { label: 'هدية بابا نويل', names: ['هدية بابا نويل', 'هديه بابا نويل', 'santa'] }
    ];
    const rowsText = assetsLines
      .map((x) => `( ${x.label} ↤︎ ${sumNames(x.names)} )`)
      .join('\n');

    const totalItems = inventory.reduce((sum, x) => sum + Number(x?.count || 0), 0);
    const totalEstimatedValue = inventory.reduce((sum, x) => {
      const meta = UNIQUE_GIFTS.find((g) => g.key === x.key);
      return sum + (Number(meta?.price || 0) * Number(x?.count || 0));
    }, 0);

    const activeBoost = row.activeBoost?.expiresAt && new Date(row.activeBoost.expiresAt).getTime() > Date.now()
      ? `✅ ${row.activeBoost.multiplier || 1}x حتى ${new Date(row.activeBoost.expiresAt).toLocaleString('ar-EG')}`
      : '❌ غير مفعل';

    await group.save();
    return ctx.reply(
      `📦 <b>أهلاً بك في قائمة ممتلكاتك</b>\n\n` +
      `${rowsText}\n\n` +
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
    const totalPrice = gift.price * qty;
    if ((senderRow.points || 0) < totalPrice) return ctx.reply(`❌ رصيدك غير كافٍ. المطلوب ${this.formatCurrency(totalPrice)}.`);

    senderRow.points -= totalPrice;
    senderRow.giftsSent = (senderRow.giftsSent || 0) + qty;
    receiverRow.giftsReceived = (receiverRow.giftsReceived || 0) + qty;

    let slot = (receiverRow.giftInventory || []).find((g) => g.key === gift.key);
    if (!slot) {
      slot = { key: gift.key, name: gift.name, count: 0 };
      receiverRow.giftInventory.push(slot);
    }
    slot.count = (slot.count || 0) + qty;
    receiverRow.points = (receiverRow.points || 0) + Math.max(1, Math.floor(gift.price / 3)) * qty;
    this.awardXp(receiverRow, qty);

    await group.save();

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
        }
      }
    }, false);
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
      [Markup.button.callback('🧠 تحدي يومي', 'group:games:gdaily'), Markup.button.callback('🏁 المتصدرين', 'group:games:gleader')],
      [Markup.button.callback('📅 سباق الأسبوع', 'group:games:gweekly'), Markup.button.callback('🗓️ سباق الشهر', 'group:games:gmonth')],
      [Markup.button.callback('🏅 لوحة المستويات', 'group:games:glevels')]
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
      '• /gdaily | تحدي يومي\n\n' +
      '<b>ثانيًا: النظام والترتيب</b>\n' +
      '• /gleader | إجمالي المتصدرين\n' +
      '• /gweekly | سباق الأسبوع\n' +
      '• /gmonth | سباق الشهر\n' +
      '• /glevels | لوحة المستويات\n' +
      '• /gprofile | ملفك في الجروب\n' +
      '• /ginvest | استثمار فلوسك\n' +
      '• /gluck | يبدأ اختيار رقم للحظ (1-1000)\n' +
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
      '<b>سادسًا: إدارة متقدمة</b>\n' +
      '• /ggame | إعدادات ألعاب الجروب\n' +
      '• /gquizset 5 | سلسلة كويز\n' +
      '• /gteam | فريقك\n' +
      '• /gteams | ترتيب الفرق\n' +
      '• /gtour | البطولة الأسبوعية (مشرف)\n\n' +
      '<b>أوامر عربية بدون سلاش</b>\n' +
      'العاب الجروب | مين انا | الغاز | سرعة الكتابة | روليت | متصدرين | اسبوعي | متصدرين الشهر | ملفي | متجر الجروب | الهدايا | ممتلكاتي | اغنى ممتلكات | استثمار فلوسي | حظ من 1 - 1000 | كشط | احصائيات الكشط\n\n' +
      `العملة: كل إجابة صحيحة = <b>${this.formatCurrency(1)}</b>.`,
      { parse_mode: 'HTML', reply_markup: keyboard.reply_markup }
    );
  }
}

module.exports = GroupGamesHandler;
