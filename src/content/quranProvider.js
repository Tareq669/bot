const { Content } = require('../database/models');

class QuranProvider {
  // قرآن كريم - آيات كاملة مع قراءات صوتية
  static async getQuranVerses() {
    const verses = [
      {
        id: 1,
        surah: 'الفاتحة',
        surahNumber: 1,
        ayah: 1,
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ۝',
        content: 'الحمد لله رب العالمين',
        translation: 'Praise be to Allah, Lord of the worlds',
        tafsir: 'أول آية في القرآن الكريم، بيان لقدرة الله ورحمته',
        audioUrl: 'https://quran.com/1/1',
        reciter: 'محمد عثمان',
        duration: '0:15'
      },
      {
        id: 2,
        surah: 'البقرة',
        surahNumber: 2,
        ayah: 255,
        text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۝',
        content: 'لا تأخذه سنة ولا نوم له ما في السماوات وما في الأرض',
        translation: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence',
        tafsir: 'آية الكرسي: عظمة الله وقدرته اللانهائية',
        audioUrl: 'https://quran.com/2/255',
        reciter: 'عبدالباسط عبدالصمد',
        duration: '1:45'
      },
      {
        id: 3,
        surah: 'آل عمران',
        surahNumber: 3,
        ayah: 26,
        text: 'قُلِ اللَّهُمَّ مَالِكَ الْمُلْكِ تُؤْتِي الْمُلْكَ مَن تَشَاءُ ۝',
        content: 'وتنزع الملك ممن تشاء وتعز من تشاء وتذل من تشاء بيدك الخير إنك على كل شيء قدير',
        translation: 'Say, "O Allah, Owner of Sovereignty, You give sovereignty to whom You will"',
        tafsir: 'الراسخ في قلوب المؤمنين معرفة ملك الله لكل شيء',
        audioUrl: 'https://quran.com/3/26',
        reciter: 'ياسين الجزائري',
        duration: '1:20'
      },
      {
        id: 4,
        surah: 'الأعراف',
        surahNumber: 7,
        ayah: 54,
        text: 'إِنَّ رَبَّكُمُ اللَّهُ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ فِي سِتَّةِ أَيَّامٍ ۝',
        content: 'ثم استوى على العرش يغشي الليل النهار يطلبه حثيثا والشمس والقمر والنجوم مسخرات بأمره',
        translation: 'Indeed, your Lord is Allah, who created the heavens and earth in six days',
        tafsir: 'خلق الله السماوات والأرض في ستة أيام وكل شيء بتدبيره',
        audioUrl: 'https://quran.com/7/54',
        reciter: 'مشاري الخراز',
        duration: '2:10'
      },
      {
        id: 5,
        surah: 'يس',
        surahNumber: 36,
        ayah: 82,
        text: 'إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا أَن يَقُولَ لَهُ كُن فَيَكُونُ ۝',
        content: 'فسبحان الذي بيده ملكوت كل شيء وإليه ترجعون',
        translation: 'His command is only when He intends a thing that He says to it, "Be," and it is',
        tafsir: 'قدرة الله المطلقة في خلق كل شيء بكلمة "كن"',
        audioUrl: 'https://quran.com/36/82',
        reciter: 'سعود الشريم',
        duration: '0:45'
      },
      {
        id: 6,
        surah: 'الحجر',
        surahNumber: 15,
        ayah: 94,
        text: 'فَاصْدَعْ بِمَا تُؤْمَرُ وَأَعْرِضْ عَنِ الْمُشْرِكِينَ ۝',
        content: 'إنا كفيناك المستهزئين',
        translation: 'So declare what you are commanded and turn away from the polytheists',
        tafsir: 'أمر الله نبيه بالجهر بالدعوة والثقة بحماية الله له',
        audioUrl: 'https://quran.com/15/94',
        reciter: 'فارس عباد',
        duration: '1:05'
      },
      {
        id: 7,
        surah: 'الحج',
        surahNumber: 22,
        ayah: 78,
        text: 'وَجَاهِدُوا فِي اللَّهِ حَقَّ جِهَادِهِ ۝',
        content: 'هو اجتباكم وما جعل عليكم في الدين من حرج',
        translation: 'And strive for Allah with the striving due to Him',
        tafsir: 'الجهاد في سبيل الله بكل جهد وطاقة',
        audioUrl: 'https://quran.com/22/78',
        reciter: 'محمود خليل الحصري',
        duration: '1:35'
      },
      {
        id: 8,
        surah: 'النور',
        surahNumber: 24,
        ayah: 35,
        text: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ ۝',
        content: 'مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ الْمِصْبَاحُ فِي زُجَاجَةٍ',
        translation: 'Allah is the Light of the heavens and the earth',
        tafsir: 'آية النور الشهيرة: تمثيل لنور الهداية والإيمان في القلب',
        audioUrl: 'https://quran.com/24/35',
        reciter: 'عبدالرحمن السديس',
        duration: '2:45'
      },
      {
        id: 9,
        surah: 'الواقعة',
        surahNumber: 56,
        ayah: 77,
        text: 'إِنَّهُ لَقُرْآنٌ كَرِيمٌ ۝',
        content: 'في كتاب مكنون لا يمسه إلا المطهرون تنزيل من رب العالمين',
        translation: 'Indeed, it is a noble Qur\'an',
        tafsir: 'عظمة القرآن الكريم وقدسيته',
        audioUrl: 'https://quran.com/56/77',
        reciter: 'التويجري',
        duration: '1:15'
      },
      {
        id: 10,
        surah: 'الملك',
        surahNumber: 67,
        ayah: 1,
        text: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ ۝',
        content: 'الذي خلق الموت والحياة ليبلوكم أيكم أحسن عملا',
        translation: 'Blessed is He in whose hand is the dominion, and He over all things has power',
        tafsir: 'بداية سورة الملك: تعظيم لله وقدرته',
        audioUrl: 'https://quran.com/67/1',
        reciter: 'أحمد العجمي',
        duration: '1:50'
      },
      {
        id: 11,
        surah: 'الإخلاص',
        surahNumber: 112,
        ayah: 1,
        text: 'قُلْ هُوَ اللَّهُ أَحَدٌ ۝',
        content: 'الله الصمد لم يلد ولم يولد ولم يكن له كفوا أحد',
        translation: 'Say, "He is Allah, [who is] One',
        tafsir: 'سورة الإخلاص: توحيد الله وتنزيهه عن كل ما لا يليق به',
        audioUrl: 'https://quran.com/112/1',
        reciter: 'القاضي',
        duration: '0:55'
      },
      {
        id: 12,
        surah: 'الفلق',
        surahNumber: 113,
        ayah: 1,
        text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝',
        content: 'من شر ما خلق ومن شر غاسق إذا وقب ومن شر النفاثات في العقد',
        translation: 'Say, "I seek refuge in the Lord of daybreak',
        tafsir: 'سورة الفلق: استعاذة بالله من جميع الشرور',
        audioUrl: 'https://quran.com/113/1',
        reciter: 'إبراهيم الأخضر',
        duration: '0:40'
      },
      {
        id: 13,
        surah: 'الناس',
        surahNumber: 114,
        ayah: 1,
        text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝',
        content: 'مَلِكِ النَّاسِ إِلَٰهِ النَّاسِ من شر الوسواس الخناس',
        translation: 'Say, "I seek refuge in the Lord of mankind',
        tafsir: 'سورة الناس: استعاذة من الوساوس وشر الشيطان',
        audioUrl: 'https://quran.com/114/1',
        reciter: 'ناصر القطامي',
        duration: '0:45'
      },
      {
        id: 14,
        surah: 'الفاتحة',
        surahNumber: 1,
        ayah: 5,
        text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝',
        content: 'اهدنا الصراط المستقيم صراط الذين أنعمت عليهم غير المغضوب عليهم ولا الضالين',
        translation: 'It is You we worship and You we ask for help',
        tafsir: 'آية من الفاتحة: التوسل لله بالعبادة والاستعانة',
        audioUrl: 'https://quran.com/1/5',
        reciter: 'عبدالباسط عبدالصمد',
        duration: '0:35'
      },
      {
        id: 15,
        surah: 'البقرة',
        surahNumber: 2,
        ayah: 286,
        text: 'لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۝',
        content: 'لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ',
        translation: 'Allah does not burden a soul beyond that it can bear',
        tafsir: 'آخر آية في البقرة: التيسير من الله للعباد',
        audioUrl: 'https://quran.com/2/286',
        reciter: 'محمد عثمان',
        duration: '1:10'
      },
      {
        id: 16,
        surah: 'آل عمران',
        surahNumber: 3,
        ayah: 102,
        text: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ حَقَّ تُقَاتِهِ ۝',
        content: 'وَلَا تَمُوتُنَّ إِلَّا وَأَنتُم مُّسْلِمُونَ',
        translation: 'O you who have believed, fear Allah as He should be feared',
        tafsir: 'أمر بتقوى الله وعدم الموت إلا وأنت على الإسلام',
        audioUrl: 'https://quran.com/3/102',
        reciter: 'سعود الشريم',
        duration: '1:05'
      },
      {
        id: 17,
        surah: 'النساء',
        surahNumber: 4,
        ayah: 1,
        text: 'يَا أَيُّهَا النَّاسُ اتَّقُوا رَبَّكُمُ الَّذِي خَلَقَكُم مِّن نَّفْسٍ وَاحِدَةٍ ۝',
        content: 'وخلق منها زوجها وبث منهما رجالا كثيرا ونساء',
        translation: 'O mankind, fear your Lord, who created you from one soul',
        tafsir: 'بيان خلقة الإنسان من نفس واحدة',
        audioUrl: 'https://quran.com/4/1',
        reciter: 'عبدالرحمن السديس',
        duration: '1:25'
      },
      {
        id: 18,
        surah: 'المائدة',
        surahNumber: 5,
        ayah: 3,
        text: 'الْيَوْمَ أَكْمَلْتُ لَكُمْ دِينَكُمْ وَأَتْمَمْتُ عَلَيْكُمْ نِعْمَتِي ۝',
        content: 'وَرَضِيتُ لَكُمُ الْإِسْلَامَ دِينًا',
        translation: 'This day I have perfected for you your religion and completed My favor upon you',
        tafsir: 'كمال الدين الإسلامي وتمام النعمة',
        audioUrl: 'https://quran.com/5/3',
        reciter: 'محمود خليل الحصري',
        duration: '1:15'
      },
      {
        id: 19,
        surah: 'الأنعام',
        surahNumber: 6,
        ayah: 125,
        text: 'فَمَن يُرِدِ اللَّهُ أَن يَهْدِيَهُ يَشْرَحْ صَدْرَهُ لِلْإِسْلَامِ ۝',
        content: 'ومن يرد أن يضله يجعل صدره ضيقا حرجا',
        translation: 'So whoever Allah wants to guide - He expands his breast to [contain] Islam',
        tafsir: 'الهداية من عند الله وتوسيع الصدر للإيمان',
        audioUrl: 'https://quran.com/6/125',
        reciter: 'ياسين الجزائري',
        duration: '1:30'
      },
      {
        id: 20,
        surah: 'التوبة',
        surahNumber: 9,
        ayah: 51,
        text: 'قُل لَّن يُصِيبَنَا إِلَّا مَا كَتَبَ اللَّهُ لَنَا هُوَ مَوْلَانَا ۝',
        content: 'وعلى الله فليتوكل المؤمنون',
        translation: 'Say, "Never will we be struck except by what Allah has decreed for us',
        tafsir: 'التوكل على الله وقدره',
        audioUrl: 'https://quran.com/9/51',
        reciter: 'مشاري الخراز',
        duration: '0:55'
      },
      {
        id: 21,
        surah: 'يونس',
        surahNumber: 10,
        ayah: 57,
        text: 'يَا أَيُّهَا النَّاسُ قَدْ جَاءَتْكُم مَّوْعِظَةٌ مِّن رَّبِّكُمْ وَشِفَاءٌ لِّمَا فِي الصُّدُورِ ۝',
        content: 'وهدى ورحمة للمؤمنين',
        translation: 'O people, there has to come to you instruction from your Lord and healing for what is in the breasts',
        tafsir: 'القرآن موعظة وشفاء للقلوب',
        audioUrl: 'https://quran.com/10/57',
        reciter: 'فارس عباد',
        duration: '1:20'
      },
      {
        id: 22,
        surah: 'إبراهيم',
        surahNumber: 14,
        ayah: 7,
        text: 'وَإِذْ تَأَذَّنَ رَبُّكُمْ لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ ۝',
        content: 'ولئن كفرتم إن عذابي لشديد',
        translation: 'And [remember] when your Lord proclaimed, "If you are grateful, I will surely increase you',
        tafsir: 'وعد من الله بزيادة النعم عند الشكر',
        audioUrl: 'https://quran.com/14/7',
        reciter: 'سعود الشريم',
        duration: '1:05'
      },
      {
        id: 23,
        surah: 'الإسراء',
        surahNumber: 17,
        ayah: 80,
        text: 'وَقُل رَّبِّ أَدْخِلْنِي مُدْخَلَ صِدْقٍ وَأَخْرِجْنِي مُخْرَجَ صِدْقٍ ۝',
        content: 'وَاجْعَل لِّي مِن لَّدُنكَ سُلْطَانًا نَّصِيرًا',
        translation: 'And say, "My Lord, cause me to enter a sound entrance and to exit a sound exit',
        tafsir: 'دعاء بالدخول والخروج على الحق والصدق',
        audioUrl: 'https://quran.com/17/80',
        reciter: 'محمود خليل الحصري',
        duration: '1:10'
      },
      {
        id: 24,
        surah: 'الكهف',
        surahNumber: 18,
        ayah: 10,
        text: 'إِذْ أَوَى الْفِتْيَةُ إِلَى الْكَهْفِ فَقَالُوا رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً ۝',
        content: 'وهيئ لنا من أمرنا رشدا',
        translation: 'When the youths retired to the cave and said, "Our Lord, give us from Yourself a mercy"',
        tafsir: 'دعاء أصحاب الكهف بالرحمة والرشد',
        audioUrl: 'https://quran.com/18/10',
        reciter: 'عبدالرحمن السديس',
        duration: '1:30'
      },
      {
        id: 25,
        surah: 'مريم',
        surahNumber: 19,
        ayah: 64,
        text: 'مَا نَحْنُ بِأَصْحَابِ الْكَرْسِيِّ إِن كُلُّ مَن فِي السَّمَاوَاتِ وَالْأَرْضِ إِلَّا آتِي الرَّحْمَٰنِ عَبْدًا ۝',
        content: 'لقد أحصاهم وعدهم عدا',
        translation: 'We are not the keepers of the Throne, but rather we are servants come to you',
        tafsir: 'تعبد الملائكة لله وخضوعهم له',
        audioUrl: 'https://quran.com/19/64',
        reciter: 'ياسين الجزائري',
        duration: '1:15'
      },
      {
        id: 26,
        surah: 'طه',
        surahNumber: 20,
        ayah: 14,
        text: 'فَاعْبُدْنِي وَأَقِمِ الصَّلَاةَ لِذِكْرِي ۝',
        content: 'إن الساعة آتية أكاد أخفيها',
        translation: 'So worship Me and establish prayer for My remembrance',
        tafsir: 'أمر بعبادة الله وإقام الصلاة',
        audioUrl: 'https://quran.com/20/14',
        reciter: 'مشاري الخراز',
        duration: '1:00'
      },
      {
        id: 27,
        surah: 'الأنبياء',
        surahNumber: 21,
        ayah: 107,
        text: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ ۝',
        content: 'قل يا محمد لهم',
        translation: 'And We have not sent you, [O Muhammad], except as a mercy to the worlds',
        tafsir: 'رسالة محمد صلى الله عليه وسلم رحمة للعالمين',
        audioUrl: 'https://quran.com/21/107',
        reciter: 'فارس عباد',
        duration: '0:55'
      },
      {
        id: 28,
        surah: 'السجدة',
        surahNumber: 32,
        ayah: 15,
        text: 'إِنَّمَا يُؤْمِنُ بِآيَاتِنَا الَّذِينَ إِذَا ذُكِّرُوا بِهَا خَرُّوا سُجَّدًا وَسَبَّحُوا بِحَمْدِ رَبِّهِمْ ۝',
        content: 'وهم لا يستكبرون',
        translation: 'Only those believe in Our verses who, when they are reminded by them, fall down in prostration',
        tafsir: 'سمات المؤمنين الحقيقيين بخشوعهم وتسبيحهم',
        audioUrl: 'https://quran.com/32/15',
        reciter: 'التويجري',
        duration: '1:25'
      },
      {
        id: 29,
        surah: 'ص',
        surahNumber: 38,
        ayah: 29,
        text: 'هَٰذَا ذِكْرٌ فَلْيَذَّكَّرْ بِهِ مَن كَانَ لَهُ قَلْبٌ أَوْ أَلْقَى السَّمْعَ وَهُوَ شَهِيدٌ ۝',
        content: 'والقرآن ذكر للعالمين',
        translation: 'This is a reminder; so let whoever wills take to his Lord a way',
        tafsir: 'القرآن ذكرى للمتفكرين والمتدبرين',
        audioUrl: 'https://quran.com/38/29',
        reciter: 'أحمد العجمي',
        duration: '1:10'
      },
      {
        id: 30,
        surah: 'الزمر',
        surahNumber: 39,
        ayah: 53,
        text: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۝',
        content: 'إن الله يغفر الذنوب جميعا إنه هو الغفور الرحيم',
        translation: 'Say, "O My servants who have transgressed against themselves, do not despair of the mercy of Allah',
        tafsir: 'رحمة الله الواسعة وقبوله للتوبة',
        audioUrl: 'https://quran.com/39/53',
        reciter: 'القاضي',
        duration: '1:35'
      },
      {
        id: 31,
        surah: 'غافر',
        surahNumber: 40,
        ayah: 60,
        text: 'وَقَالَ رَبُّكُمُ ادْعُونِي أَسْتَجِبْ لَكُمْ ۝',
        content: 'إن الذين يستكبرون عن عبادتي سيدخلون جهنم داخرون',
        translation: 'And your Lord has said, "Call upon Me; I will respond to you',
        tafsir: 'الدعاء وأهمية التضرع إلى الله',
        audioUrl: 'https://quran.com/40/60',
        reciter: 'عبدالباسط عبدالصمد',
        duration: '1:20'
      },
      {
        id: 32,
        surah: 'الشورى',
        surahNumber: 42,
        ayah: 13,
        text: 'شَرَعَ لَكُم مِّنَ الدِّينِ مَا وَصَّىٰ بِهِ نُوحًا وَالَّذِي أَوْحَيْنَا إِلَيْكَ ۝',
        content: 'وما وصينا به إبراهيم وموسى وعيسى أن أقيموا الدين ولا تتفرقوا فيه',
        translation: 'He has ordained for you of religion what He enjoined upon Noah',
        tafsir: 'وحدة الدين عند جميع الأنبياء',
        audioUrl: 'https://quran.com/42/13',
        reciter: 'محمد عثمان',
        duration: '1:45'
      }
    ];

    return verses;
  }

  // الحصول على آية عشوائية
  static async getRandomVerse() {
    const verses = await this.getQuranVerses();
    return verses[Math.floor(Math.random() * verses.length)];
  }

  // الحصول على آية حسب السورة
  static async getVerseByName(surahName) {
    const verses = await this.getQuranVerses();
    return verses.filter(v => v.surah.includes(surahName));
  }

  // قائمة السور كاملة
  static async getAllSurahs() {
    const surahs = [
      { number: 1, name: 'الفاتحة', ayahs: 7, type: 'مكية', topic: 'الحمد والتوحيد' },
      { number: 2, name: 'البقرة', ayahs: 286, type: 'مدنية', topic: 'الأحكام والتشريعات' },
      { number: 3, name: 'آل عمران', ayahs: 200, type: 'مدنية', topic: 'المجادلة والحوار' },
      { number: 4, name: 'النساء', ayahs: 176, type: 'مدنية', topic: 'حقوق النساء' },
      { number: 5, name: 'المائدة', ayahs: 120, type: 'مدنية', topic: 'العقود والعهود' },
      { number: 6, name: 'الأنعام', ayahs: 165, type: 'مكية', topic: 'التوحيد والحكمة' },
      { number: 7, name: 'الأعراف', ayahs: 206, type: 'مكية', topic: 'القصص والعبر' },
      { number: 8, name: 'الأنفال', ayahs: 75, type: 'مدنية', topic: 'الجهاد والغنائم' },
      { number: 9, name: 'التوبة', ayahs: 129, type: 'مدنية', topic: 'التوبة والمغفرة' },
      { number: 10, name: 'يونس', ayahs: 109, type: 'مكية', topic: 'التوحيد والأنبياء' },
      { number: 11, name: 'هود', ayahs: 123, type: 'مكية', topic: 'قصة نوح وشعيب' },
      { number: 12, name: 'يوسف', ayahs: 111, type: 'مكية', topic: 'قصة يوسف الكاملة' },
      { number: 13, name: 'الرعد', ayahs: 43, type: 'مدنية', topic: 'قدرة الله' },
      { number: 14, name: 'إبراهيم', ayahs: 52, type: 'مكية', topic: 'دعاء إبراهيم' },
      { number: 15, name: 'الحجر', ayahs: 99, type: 'مكية', topic: 'تثبيت الرسول' },
      { number: 16, name: 'النحل', ayahs: 128, type: 'مكية', topic: 'نعم الله' },
      { number: 17, name: 'الإسراء', ayahs: 111, type: 'مكية', topic: 'الإسراء والمعراج' },
      { number: 18, name: 'الكهف', ayahs: 110, type: 'مكية', topic: 'قصة أصحاب الكهف' },
      { number: 19, name: 'مريم', ayahs: 98, type: 'مكية', topic: 'قصص النبيات' },
      { number: 20, name: 'طه', ayahs: 135, type: 'مكية', topic: 'قصة موسى' },
      { number: 21, name: 'الأنبياء', ayahs: 112, type: 'مكية', topic: 'قصص الأنبياء' },
      { number: 22, name: 'الحج', ayahs: 78, type: 'مدنية', topic: 'مناسك الحج' },
      { number: 23, name: 'المؤمنون', ayahs: 118, type: 'مكية', topic: 'صفات المؤمنين' },
      { number: 24, name: 'النور', ayahs: 64, type: 'مدنية', topic: 'آداب المنزل' },
      { number: 25, name: 'الفرقان', ayahs: 77, type: 'مكية', topic: 'الفرقان بين الحق والباطل' },
      { number: 26, name: 'الشعراء', ayahs: 227, type: 'مكية', topic: 'قصص الأنبياء' },
      { number: 27, name: 'النمل', ayahs: 93, type: 'مكية', topic: 'قصة سليمان والنملة' },
      { number: 28, name: 'القصص', ayahs: 88, type: 'مكية', topic: 'قصة موسى والخضر' },
      { number: 29, name: 'العنكبوت', ayahs: 69, type: 'مكية', topic: 'الابتلاء والصبر' },
      { number: 30, name: 'الروم', ayahs: 60, type: 'مكية', topic: 'آيات الله' },
      { number: 31, name: 'لقمان', ayahs: 34, type: 'مكية', topic: 'وصايا لقمان' },
      { number: 32, name: 'السجدة', ayahs: 30, type: 'مكية', topic: 'السجود والخشوع' },
      { number: 33, name: 'الأحزاب', ayahs: 73, type: 'مدنية', topic: 'نساء النبي' },
      { number: 34, name: 'سبأ', ayahs: 54, type: 'مكية', topic: 'قصة سليمان وملكة سبأ' },
      { number: 35, name: 'فاطر', ayahs: 45, type: 'مكية', topic: 'خلق السماوات والأرض' },
      { number: 36, name: 'يس', ayahs: 83, type: 'مكية', topic: 'القيامة والديان' },
      { number: 37, name: 'الصافات', ayahs: 182, type: 'مكية', topic: 'قصص الأنبياء' },
      { number: 38, name: 'ص', ayahs: 88, type: 'مكية', topic: 'قصة داود وسليمان' },
      { number: 39, name: 'الزمر', ayahs: 75, type: 'مكية', topic: 'الإخلاص والتوحيد' },
      { number: 40, name: 'غافر', ayahs: 85, type: 'مكية', topic: 'الدعاء والرجاء' },
      { number: 41, name: 'فصلت', ayahs: 54, type: 'مكية', topic: 'الخلق والحكمة' },
      { number: 42, name: 'الشورى', ayahs: 53, type: 'مكية', topic: 'الشورى والعدل' },
      { number: 43, name: 'الزخرف', ayahs: 89, type: 'مكية', topic: 'نعم الله' },
      { number: 44, name: 'الدخان', ayahs: 59, type: 'مكية', topic: 'ليلة القدر' },
      { number: 45, name: 'الجاثية', ayahs: 37, type: 'مكية', topic: 'آيات الله' },
      { number: 46, name: 'الأحقاف', ayahs: 35, type: 'مكية', topic: 'بر الوالدين' },
      { number: 47, name: 'محمد', ayahs: 38, type: 'مدنية', topic: 'آداب الحرب' },
      { number: 48, name: 'الفتح', ayahs: 29, type: 'مدنية', topic: 'فتح مكة' },
      { number: 49, name: 'الحجرات', ayahs: 18, type: 'مدنية', topic: 'آداب المجتمع' },
      { number: 50, name: 'ق', ayahs: 45, type: 'مكية', topic: 'القيامة والحشر' },
      { number: 51, name: 'الذاريات', ayahs: 60, type: 'مكية', topic: 'الرزق والمعاش' },
      { number: 52, name: 'الطور', ayahs: 49, type: 'مكية', topic: 'عظمة الخلق' },
      { number: 53, name: 'النجم', ayahs: 62, type: 'مكية', topic: 'الرؤيا والنبوة' },
      { number: 54, name: 'القمر', ayahs: 55, type: 'مكية', topic: 'قصة نوح وعاد وثمود' },
      { number: 55, name: 'الرحمن', ayahs: 78, type: 'مدنية', topic: 'نعم الرحمن' },
      { number: 56, name: 'الواقعة', ayahs: 96, type: 'مكية', topic: 'يوم القيامة' },
      { number: 57, name: 'الحديد', ayahs: 29, type: 'مدنية', topic: 'التوكل والإنفاق' },
      { number: 58, name: 'المجادلة', ayahs: 22, type: 'مدنية', topic: 'الظهار' },
      { number: 59, name: 'الحشر', ayahs: 24, type: 'مدنية', topic: 'بني النضير' },
      { number: 60, name: 'الممتحنة', ayahs: 13, type: 'مدنية', topic: 'اختبار الإيمان' },
      { number: 61, name: 'الصف', ayahs: 14, type: 'مدنية', topic: 'الجهاد' },
      { number: 62, name: 'الجمعة', ayahs: 11, type: 'مدنية', topic: 'صلاة الجمعة' },
      { number: 63, name: 'المنافقون', ayahs: 11, type: 'مدنية', topic: 'صفات المنافقين' },
      { number: 64, name: 'التغابن', ayahs: 18, type: 'مدنية', topic: 'المعاملات' },
      { number: 65, name: 'الطلاق', ayahs: 12, type: 'مدنية', topic: 'أحكام الطلاق' },
      { number: 66, name: 'التحريم', ayahs: 12, type: 'مدنية', topic: 'تحريم زوجات النبي' },
      { number: 67, name: 'الملك', ayahs: 30, type: 'مكية', topic: 'الملك والقدرة' },
      { number: 68, name: 'القلم', ayahs: 52, type: 'مكية', topic: 'الصبر والحكمة' },
      { number: 69, name: 'الحاقة', ayahs: 52, type: 'مكية', topic: 'القيامة' },
      { number: 70, name: 'المعارج', ayahs: 44, type: 'مكية', topic: 'صفات المؤمنين' },
      { number: 71, name: 'نوح', ayahs: 28, type: 'مكية', topic: 'قصة نوح' },
      { number: 72, name: 'الجن', ayahs: 28, type: 'مكية', topic: 'استماع الجن' },
      { number: 73, name: 'المزمل', ayahs: 20, type: 'مكية', topic: 'صلاة الليل' },
      { number: 74, name: 'المدثر', ayahs: 56, type: 'مكية', topic: 'تكليف الرسول' },
      { number: 75, name: 'القيامة', ayahs: 40, type: 'مكية', topic: 'أهوال القيامة' },
      { number: 76, name: 'الإنسان', ayahs: 31, type: 'مدنية', topic: 'نعم الجنة' },
      { number: 77, name: 'المرسلات', ayahs: 50, type: 'مكية', topic: 'رسل الله' },
      { number: 78, name: 'النبأ', ayahs: 40, type: 'مكية', topic: 'البعث والقيامة' },
      { number: 79, name: 'النازعات', ayahs: 46, type: 'مكية', topic: 'الملائكة' },
      { number: 80, name: 'عبس', ayahs: 42, type: 'مكية', topic: 'تفاوت الناس' },
      { number: 81, name: 'التكوير', ayahs: 29, type: 'مكية', topic: 'علامات الساعة' },
      { number: 82, name: 'الانفطار', ayahs: 19, type: 'مكية', topic: 'الملائكة والجنة' },
      { number: 83, name: 'المطففين', ayahs: 36, type: 'مكية', topic: 'الوزن والكيل' },
      { number: 84, name: 'الانشقاق', ayahs: 25, type: 'مكية', topic: 'تشقق السماء' },
      { number: 85, name: 'البروج', ayahs: 22, type: 'مكية', topic: 'أصحاب الأخدود' },
      { number: 86, name: 'الطارق', ayahs: 17, type: 'مكية', topic: 'النجم الثاقب' },
      { number: 87, name: 'الأعلى', ayahs: 19, type: 'مكية', topic: 'التسبيح والتطهير' },
      { number: 88, name: 'الغاشية', ayahs: 26, type: 'مكية', topic: 'الجنة والنار' },
      { number: 89, name: 'الفجر', ayahs: 30, type: 'مكية', topic: 'الفجر الصادق' },
      { number: 90, name: 'البلد', ayahs: 20, type: 'مكية', topic: 'الإنسان والبلد' },
      { number: 91, name: 'الشمس', ayahs: 15, type: 'مكية', topic: 'الشمس والقمر' },
      { number: 92, name: 'الليل', ayahs: 21, type: 'مكية', topic: 'الليل والنهار' },
      { number: 93, name: 'الضحى', ayahs: 11, type: 'مكية', topic: 'تعزية الرسول' },
      { number: 94, name: 'الشرح', ayahs: 8, type: 'مكية', topic: 'شرح الصدر' },
      { number: 95, name: 'التين', ayahs: 8, type: 'مكية', topic: 'التين والزيتون' },
      { number: 96, name: 'العلق', ayahs: 19, type: 'مكية', topic: 'أول ما نزل' },
      { number: 97, name: 'القدر', ayahs: 5, type: 'مكية', topic: 'ليلة القدر' },
      { number: 98, name: 'البينة', ayahs: 8, type: 'مدنية', topic: 'البينة الواضحة' },
      { number: 99, name: 'الزلزلة', ayahs: 8, type: 'مدنية', topic: 'الزلزال' },
      { number: 100, name: 'العاديات', ayahs: 11, type: 'مكية', topic: 'الخيل' },
      { number: 101, name: 'القارعة', ayahs: 11, type: 'مكية', topic: 'الساعة' },
      { number: 102, name: 'التكاثر', ayahs: 8, type: 'مكية', topic: 'التكاثر والتنافس' },
      { number: 103, name: 'العصر', ayahs: 3, type: 'مكية', topic: 'العصر والزمان' },
      { number: 104, name: 'الهمزة', ayahs: 9, type: 'مكية', topic: 'الغيبة والنميمة' },
      { number: 105, name: 'الفيل', ayahs: 5, type: 'مكية', topic: 'أصحاب الفيل' },
      { number: 106, name: 'قريش', ayahs: 4, type: 'مكية', topic: 'رحلات قريش' },
      { number: 107, name: 'الماعون', ayahs: 7, type: 'مكية', topic: 'المعاملة والإحسان' },
      { number: 108, name: 'الكوثر', ayahs: 3, type: 'مكية', topic: 'نهر الكوثر' },
      { number: 109, name: 'الكافرون', ayahs: 6, type: 'مكية', topic: 'براءة من الشرك' },
      { number: 110, name: 'النصر', ayahs: 3, type: 'مدنية', topic: 'نصر الله' },
      { number: 111, name: 'المسد', ayahs: 5, type: 'مكية', topic: 'أبو لهب' },
      { number: 112, name: 'الإخلاص', ayahs: 4, type: 'مكية', topic: 'التوحيد الخالص' },
      { number: 113, name: 'الفلق', ayahs: 5, type: 'مكية', topic: 'الاستعاذة من الشرور' },
      { number: 114, name: 'الناس', ayahs: 6, type: 'مكية', topic: 'الاستعاذة من الوساوس' }
    ];
    return surahs;
  }

  // تفسير موجز للآية
  static getTafsirShort(ayahText) {
    const tafsirMap = {
      'الحمد لله': 'شكر الله على نعمه',
      'الملك': 'الحكم والسيطرة',
      'نور': 'الهداية والإضاءة',
      'دعاء': 'التضرع إلى الله',
      'استعاذة': 'الاستجارة من الله',
      'قدير': 'القادر على كل شيء',
      'حكيم': 'صاحب الحكمة والحكم'
    };

    for (const [key, value] of Object.entries(tafsirMap)) {
      if (ayahText.includes(key)) {
        return value;
      }
    }
    return 'آية كريمة من كتاب الله';
  }

  // احصائيات القرآن
  static async getQuranStats() {
    return {
      totalSurahs: 114,
      totalAyahs: 6236,
      totalWords: 77934,
      totalLetters: 323670,
      longestSurah: 'البقرة (286 آية)',
      shortestSurah: 'الكوثر (3 آيات)',
      meccanSurahs: 86,
      medinanSurahs: 28,
      timeToComplete: '30-40 ساعة تقريباً',
      dailyReading: '10-15 دقيقة',
      weeklyGoal: 'ختمة واحدة في الشهر',
      yearlyGoal: '12 ختمة كاملة',
      versesAdded: 32,
      reciterCount: 7,
      themes: ['التوحيد', 'القصص', 'الأحكام', 'الحكمة', 'القيامة', 'الجنة والنار']
    };
  }

  // البحث عن آية بالكلمة المفتاحية
  static async searchVerses(keyword) {
    const verses = await this.getQuranVerses();
    return verses.filter(v => 
      v.text.includes(keyword) || 
      v.content.includes(keyword) || 
      v.tafsir.includes(keyword) ||
      v.surah.includes(keyword)
    );
  }

  // الحصول على آيات من موضوع معين
  static async getVersesByTheme(theme) {
    const verses = await this.getQuranVerses();
    const themeMap = {
      'تعظيم': [1, 2, 4, 5, 10],
      'دعاء': [14, 21, 28, 30, 31],
      'رحمة': [15, 30, 36],
      'توحيد': [7, 11, 27, 32],
      'قيامة': [25, 29, 30],
      'الجنة': [22, 25],
      'استعاذة': [19, 20, 23, 26],
      'توكل': [20, 21, 29],
      'علم': [11, 24, 27]
    };
    const ids = themeMap[theme] || [];
    return verses.filter(v => ids.includes(v.id));
  }

  // الآيات الأكثر تلاوة
  static async getMostRecitedVerses() {
    const verses = await this.getQuranVerses();
    return verses.sort((a, b) => {
      const durationA = parseInt(a.duration.split(':')[0]) * 60 + parseInt(a.duration.split(':')[1]);
      const durationB = parseInt(b.duration.split(':')[0]) * 60 + parseInt(b.duration.split(':')[1]);
      return durationB - durationA;
    }).slice(0, 10);
  }

  // قارئ القرآن المشهورين
  static async getFamousReciters() {
    const reciters = [
      { name: 'عبدالباسط عبدالصمد', country: 'مصر', rating: 5.0, style: 'الاستشعار' },
      { name: 'محمد عثمان', country: 'السودان', rating: 4.9, style: 'التدوير' },
      { name: 'سعود الشريم', country: 'السعودية', rating: 4.9, style: 'الأداء العالي' },
      { name: 'عبدالرحمن السديس', country: 'السعودية', rating: 4.9, style: 'الحزن' },
      { name: 'ياسين الجزائري', country: 'الجزائر', rating: 4.8, style: 'الخشوع' },
      { name: 'مشاري الخراز', country: 'الكويت', rating: 4.8, style: 'السرعة' },
      { name: 'محمود خليل الحصري', country: 'مصر', rating: 4.8, style: 'التدوير' },
      { name: 'فارس عباد', country: 'السعودية', rating: 4.7, style: 'الخشوع' },
      { name: 'أحمد العجمي', country: 'الكويت', rating: 4.7, style: 'بكاء' },
      { name: 'ناصر القطامي', country: 'السعودية', rating: 4.7, style: 'الراحة' }
    ];
    return reciters;
  }
}

module.exports = QuranProvider;
