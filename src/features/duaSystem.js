const { User } = require('../database/models');

class DuaSystem {
  /**
   * Comprehensive Dua Collection
   */
  static getDuaCollections() {
    const collections = {
      morning: {
        name: 'أذكار الصباح',
        duas: [
          {
            id: 1,
            name: 'ذكر افتتاح الصباح',
            arabic: 'أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 2,
            name: 'دعاء بداية اليوم',
            arabic: 'اللهم بك أصبحنا وبك أمسينا وبك نحيا وبك نموت وإليك النشور.',
            source: 'رواه الترمذي',
            repeat: 1
          },
          {
            id: 3,
            name: 'الثبات على الفطرة',
            arabic: 'أصبحنا على فطرة الإسلام، وعلى كلمة الإخلاص، وعلى دين نبينا محمد صلى الله عليه وسلم، وعلى ملة أبينا إبراهيم حنيفًا مسلمًا وما كان من المشركين.',
            source: 'رواه أحمد',
            repeat: 1
          },
          {
            id: 4,
            name: 'شكر النعمة',
            arabic: 'اللهم ما أصبح بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.',
            source: 'رواه أبو داود',
            repeat: 1
          },
          {
            id: 5,
            name: 'الرضا بالله',
            arabic: 'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد صلى الله عليه وسلم نبيًا.',
            source: 'رواه أبو داود',
            virtue: 'من قالها حين يصبح وحين يمسي كان حقًا على الله أن يرضيه.',
            repeat: 3
          },
          {
            id: 6,
            name: 'حفظ من كل ضرر',
            arabic: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.',
            source: 'رواه أبو داود والترمذي',
            repeat: 3
          },
          {
            id: 7,
            name: 'كفاية الهم',
            arabic: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.',
            source: 'حسن - أبو داود',
            repeat: 7
          },
          {
            id: 8,
            name: 'تسبيح عظيم',
            arabic: 'سبحان الله وبحمده.',
            source: 'رواه مسلم',
            virtue: 'من قالها مائة مرة غُفرت خطاياه وإن كانت مثل زبد البحر.',
            repeat: 100
          },
          {
            id: 9,
            name: 'توحيد وذكر',
            arabic: 'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',
            source: 'متفق عليه',
            virtue: 'حرز من الشيطان ورفعة في الدرجات.',
            repeat: 100
          },
          {
            id: 10,
            name: 'دعاء العافية',
            arabic: 'اللهم إني أسألك العفو والعافية في الدنيا والآخرة.',
            source: 'رواه أبو داود',
            repeat: 1
          },
          {
            id: 11,
            name: 'دعاء العلم والرزق',
            arabic: 'اللهم إني أسألك علمًا نافعًا، ورزقًا طيبًا، وعملًا متقبلًا.',
            source: 'رواه ابن ماجه',
            repeat: 1
          },
          {
            id: 12,
            name: 'آية الكرسي',
            arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ... (آية الكرسي).',
            source: 'سورة البقرة: 255',
            repeat: 1
          }
        ]
      },

      evening: {
        name: 'أذكار المساء',
        duas: [
          {
            id: 1,
            name: 'ذكر افتتاح المساء',
            arabic: 'أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير.',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 2,
            name: 'دعاء بداية المساء',
            arabic: 'اللهم بك أمسينا وبك أصبحنا وبك نحيا وبك نموت وإليك المصير.',
            source: 'رواه الترمذي',
            repeat: 1
          },
          {
            id: 3,
            name: 'الرضا بالله مساءً',
            arabic: 'رضيت بالله ربًا، وبالإسلام دينًا، وبمحمد صلى الله عليه وسلم نبيًا.',
            source: 'رواه أبو داود',
            repeat: 3
          },
          {
            id: 4,
            name: 'شكر النعمة مساءً',
            arabic: 'اللهم ما أمسى بي من نعمة أو بأحد من خلقك فمنك وحدك لا شريك لك، فلك الحمد ولك الشكر.',
            source: 'رواه أبو داود',
            repeat: 1
          },
          {
            id: 5,
            name: 'حفظ من الشرور',
            arabic: 'أعوذ بكلمات الله التامات من شر ما خلق.',
            source: 'رواه مسلم',
            repeat: 3
          },
          {
            id: 6,
            name: 'حفظ من الضرر',
            arabic: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.',
            source: 'رواه أبو داود والترمذي',
            repeat: 3
          },
          {
            id: 7,
            name: 'تفويض الأمر لله',
            arabic: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.',
            source: 'حسن - أبو داود',
            repeat: 7
          },
          {
            id: 8,
            name: 'شهادة التوحيد',
            arabic: 'اللهم إني أمسيت أُشهدك وأُشهد حملة عرشك وملائكتك وجميع خلقك أنك أنت الله لا إله إلا أنت وحدك لا شريك لك، وأن محمدًا عبدك ورسولك.',
            source: 'رواه أبو داود',
            repeat: 4
          },
          {
            id: 9,
            name: 'دعاء السلامة',
            arabic: 'اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي.',
            source: 'رواه أبو داود',
            repeat: 1
          },
          {
            id: 10,
            name: 'المعوذات',
            arabic: 'قل هو الله أحد، وقل أعوذ برب الفلق، وقل أعوذ برب الناس.',
            source: 'رواه الترمذي',
            repeat: 3
          },
          {
            id: 11,
            name: 'آية الكرسي',
            arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ... (آية الكرسي).',
            source: 'سورة البقرة: 255',
            repeat: 1
          }
        ]
      },

      protection: {
        name: 'أدعية الحماية والحفظ',
        duas: [
          {
            id: 1,
            arabic: 'أعوذ بكلمات الله التامات من شر ما خلق.',
            meaning: 'للتحصين من الشرور والآفات.',
            source: 'رواه مسلم',
            repeat: 3
          },
          {
            id: 2,
            arabic: 'بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم.',
            meaning: 'حفظ من الضرر المفاجئ بإذن الله.',
            source: 'رواه أبو داود والترمذي',
            repeat: 3
          },
          {
            id: 3,
            arabic: 'حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم.',
            meaning: 'تفويض الأمر لله وكفاية الهم.',
            source: 'حسن - أبو داود',
            repeat: 7
          },
          {
            id: 4,
            arabic: 'أعوذ بكلمات الله التامة من كل شيطان وهامة ومن كل عين لامة.',
            meaning: 'تحصين من العين والضرر.',
            source: 'رواه البخاري',
            repeat: 1
          },
          {
            id: 5,
            arabic: 'اللهم احفظني من بين يدي ومن خلفي، وعن يميني وعن شمالي، ومن فوقي، وأعوذ بعظمتك أن أغتال من تحتي.',
            meaning: 'حفظ شامل من الجهات كلها.',
            source: 'رواه أبو داود',
            repeat: 1
          },
          {
            id: 6,
            arabic: 'اللهم إني أعوذ بك من جهد البلاء، ودرك الشقاء، وسوء القضاء، وشماتة الأعداء.',
            meaning: 'استعاذة من المصائب والابتلاءات الشديدة.',
            source: 'متفق عليه',
            repeat: 1
          },
          {
            id: 7,
            arabic: 'أعوذ بكلمات الله التامات من غضبه وعقابه، ومن شر عباده، ومن همزات الشياطين وأن يحضرون.',
            meaning: 'حماية من وساوس الشياطين.',
            source: 'رواه الترمذي',
            repeat: 1
          },
          {
            id: 8,
            arabic: 'اللهم فاطر السماوات والأرض، عالم الغيب والشهادة، رب كل شيء ومليكه، أعوذ بك من شر نفسي ومن شر الشيطان وشِركه.',
            meaning: 'حفظ القلب والعمل من الشر.',
            source: 'رواه أبو داود والترمذي',
            repeat: 1
          },
          {
            id: 9,
            arabic: 'اللهم إني أعوذ بك من زوال نعمتك، وتحول عافيتك، وفجاءة نقمتك، وجميع سخطك.',
            meaning: 'حفظ النعمة ودفع البلاء.',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 10,
            arabic: 'لا إله إلا أنت سبحانك إني كنت من الظالمين.',
            meaning: 'دعاء كرب وتفريج هم.',
            source: 'رواه الترمذي',
            repeat: 3
          }
        ]
      },

      forgiveness: {
        name: 'أدعية المغفرة والتوبة',
        duas: [
          {
            id: 1,
            name: 'سيد الاستغفار',
            arabic: 'اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك علي، وأبوء بذنبي، فاغفر لي فإنه لا يغفر الذنوب إلا أنت.',
            source: 'رواه البخاري',
            virtue: 'من قاله موقنًا به ومات دخل الجنة.',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'أستغفر الله الذي لا إله إلا هو الحي القيوم وأتوب إليه.',
            source: 'رواه أبو داود',
            virtue: 'مغفرة الذنب بإذن الله.',
            repeat: 3
          },
          {
            id: 3,
            arabic: 'رب اغفر لي وتب علي إنك أنت التواب الرحيم.',
            source: 'رواه الترمذي',
            repeat: 100
          },
          {
            id: 4,
            arabic: 'اللهم اغفر لي خطيئتي وجهلي وإسرافي في أمري، وما أنت أعلم به مني.',
            source: 'متفق عليه',
            repeat: 1
          },
          {
            id: 5,
            arabic: 'ربنا ظلمنا أنفسنا وإن لم تغفر لنا وترحمنا لنكونن من الخاسرين.',
            source: 'سورة الأعراف: 23',
            repeat: 1
          },
          {
            id: 6,
            arabic: 'رب اغفر وارحم وأنت خير الراحمين.',
            source: 'سورة المؤمنون: 118',
            repeat: 1
          },
          {
            id: 7,
            arabic: 'اللهم إنك عفو كريم تحب العفو فاعف عني.',
            source: 'رواه الترمذي',
            timing: 'خاصة في العشر الأواخر وليلة القدر',
            repeat: 1
          },
          {
            id: 8,
            arabic: 'رب اغفر لي ولوالدي وللمؤمنين يوم يقوم الحساب.',
            source: 'سورة إبراهيم: 41',
            repeat: 1
          },
          {
            id: 9,
            arabic: 'أستغفر الله وأتوب إليه.',
            source: 'هدي نبوي',
            virtue: 'كان النبي ﷺ يستغفر في اليوم أكثر من سبعين مرة.',
            repeat: 100
          },
          {
            id: 10,
            arabic: 'سبحانك اللهم وبحمدك، أشهد أن لا إله إلا أنت، أستغفرك وأتوب إليك.',
            source: 'رواه النسائي في عمل اليوم والليلة',
            repeat: 1
          }
        ]
      },

      sustenance: {
        name: 'أدعية الرزق',
        duas: [
          {
            id: 1,
            arabic: 'اللهم اكفني بحلالك عن حرامك وأغنني بفضلك عمن سواك.',
            source: 'رواه الترمذي',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'اللهم إني أسألك علمًا نافعًا، ورزقًا طيبًا، وعملًا متقبلًا.',
            source: 'رواه ابن ماجه',
            repeat: 1
          },
          {
            id: 3,
            arabic: 'رب إني لما أنزلت إلي من خير فقير.',
            source: 'سورة القصص: 24',
            repeat: 1
          },
          {
            id: 4,
            arabic: 'اللهم إني أسألك رزقًا واسعًا طيبًا مباركًا فيه.',
            source: 'دعاء مأثور',
            repeat: 1
          },
          {
            id: 5,
            arabic: 'اللهم بارك لنا فيما رزقتنا وقنا عذاب النار.',
            source: 'دعاء مأثور',
            repeat: 1
          },
          {
            id: 6,
            arabic: 'اللهم أغنني بفضلك عمن سواك، ووسّع علي من رزقك.',
            source: 'دعاء صالح',
            repeat: 1
          },
          {
            id: 7,
            arabic: 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار.',
            source: 'سورة البقرة: 201',
            repeat: 1
          },
          {
            id: 8,
            arabic: 'اللهم إني أعوذ بك من الكفر والفقر، وأعوذ بك من عذاب القبر.',
            source: 'رواه أبو داود',
            repeat: 3
          },
          {
            id: 9,
            arabic: 'اللهم قنّعني بما رزقتني، وبارك لي فيه، واخلف عليّ كل غائبة بخير.',
            source: 'دعاء مأثور',
            repeat: 1
          },
          {
            id: 10,
            arabic: 'اللهم ارزقني رزقًا حلالًا طيبًا من غير كَدٍّ ولا تعبٍ ولا منّةٍ من أحد من خلقك.',
            source: 'دعاء صالح',
            repeat: 1
          }
        ]
      },

      sleep: {
        name: 'أدعية النوم',
        duas: [
          {
            id: 1,
            arabic: 'باسمك اللهم أموت وأحيا.',
            source: 'رواه البخاري',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'اللهم باسمك ربي وضعت جنبي وبك أرفعه، إن أمسكت نفسي فارحمها، وإن أرسلتها فاحفظها بما تحفظ به عبادك الصالحين.',
            source: 'متفق عليه',
            repeat: 1
          },
          {
            id: 3,
            arabic: 'اللهم أسلمت نفسي إليك، وفوضت أمري إليك، وألجأت ظهري إليك، رغبةً ورهبةً إليك، لا ملجأ ولا منجى منك إلا إليك، آمنت بكتابك الذي أنزلت، وبنبيك الذي أرسلت.',
            source: 'متفق عليه',
            repeat: 1
          },
          {
            id: 4,
            arabic: 'اللهم قني عذابك يوم تبعث عبادك.',
            source: 'رواه أبو داود',
            action: 'تقال عند وضع اليد اليمنى تحت الخد الأيمن.',
            repeat: 3
          },
          {
            id: 5,
            arabic: 'قراءة آية الكرسي قبل النوم.',
            source: 'رواه البخاري',
            virtue: 'لا يزال عليك من الله حافظ ولا يقربك شيطان حتى تصبح.',
            repeat: 1
          },
          {
            id: 6,
            arabic: 'قراءة: قل هو الله أحد، وقل أعوذ برب الفلق، وقل أعوذ برب الناس، مع النفث في الكفين ومسح الجسد.',
            source: 'رواه البخاري',
            repeat: 3
          },
          {
            id: 7,
            arabic: 'سبحان الله (33)، الحمد لله (33)، الله أكبر (34).',
            source: 'متفق عليه',
            repeat: 1
          },
          {
            id: 8,
            arabic: 'أعوذ بكلمات الله التامات من شر ما خلق.',
            source: 'رواه مسلم',
            repeat: 3
          },
          {
            id: 9,
            arabic: 'اللهم رب السماوات السبع ورب العرش العظيم، ربنا ورب كل شيء، فالق الحب والنوى، منزل التوراة والإنجيل والفرقان، أعوذ بك من شر كل شيء أنت آخذ بناصيته.',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 10,
            arabic: 'الحمد لله الذي أطعمنا وسقانا وكفانا وآوانا، فكم ممن لا كافي له ولا مؤوي.',
            source: 'رواه مسلم',
            repeat: 1
          }
        ]
      },

      food: {
        name: 'أدعية الطعام',
        duas: [
          {
            id: 1,
            arabic: 'بسم الله.',
            timing: 'قبل الطعام',
            source: 'متفق عليه',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'بسم الله أوله وآخره.',
            timing: 'إذا نسي التسمية أول الطعام',
            source: 'رواه الترمذي',
            repeat: 1
          },
          {
            id: 3,
            arabic: 'الحمد لله الذي أطعمنا وسقانا وجعلنا مسلمين.',
            timing: 'بعد الطعام',
            source: 'رواه أبو داود',
            repeat: 1
          },
          {
            id: 4,
            arabic: 'الحمد لله حمدًا كثيرًا طيبًا مباركًا فيه، غير مكفيٍّ ولا مودَّعٍ ولا مستغنىً عنه ربَّنا.',
            timing: 'بعد الفراغ من الطعام',
            source: 'رواه البخاري',
            repeat: 1
          },
          {
            id: 5,
            arabic: 'اللهم بارك لنا فيما رزقتنا وقنا عذاب النار.',
            timing: 'قبل الأكل',
            source: 'دعاء مأثور',
            repeat: 1
          },
          {
            id: 6,
            arabic: 'اللهم بارك لهم فيما رزقتهم، واغفر لهم وارحمهم.',
            timing: 'دعاء لصاحب الطعام',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 7,
            arabic: 'ذهب الظمأ وابتلت العروق وثبت الأجر إن شاء الله.',
            timing: 'عند الإفطار',
            source: 'رواه أبو داود',
            repeat: 1
          },
          {
            id: 8,
            arabic: 'أفطر عندكم الصائمون، وأكل طعامكم الأبرار، وتنزلت عليكم الملائكة.',
            timing: 'دعاء بعد الإفطار عند قوم',
            source: 'رواه أبو داود',
            repeat: 1
          },
          {
            id: 9,
            arabic: 'اللهم بارك لنا فيه وأطعمنا خيرًا منه.',
            timing: 'عند تناول طعام عام',
            source: 'رواه الترمذي',
            repeat: 1
          },
          {
            id: 10,
            arabic: 'اللهم بارك لنا فيه وزدنا منه.',
            timing: 'عند شرب اللبن',
            source: 'رواه الترمذي',
            repeat: 1
          },
          {
            id: 11,
            arabic: 'الحمد لله الذي سقانا عذبًا فراتًا برحمته، ولم يجعله ملحًا أجاجًا بذنوبنا.',
            timing: 'بعد الشرب',
            source: 'أثر حسن المعنى',
            repeat: 1
          }
        ]
      },

      travel: {
        name: 'أدعية السفر',
        duas: [
          {
            id: 1,
            name: 'دعاء الركوب',
            arabic: 'الله أكبر، الله أكبر، الله أكبر، سبحان الذي سخر لنا هذا وما كنا له مقرنين وإنا إلى ربنا لمنقلبون.',
            source: 'رواه الترمذي',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'اللهم إنا نسألك في سفرنا هذا البر والتقوى، ومن العمل ما ترضى.',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 3,
            arabic: 'اللهم هون علينا سفرنا هذا واطو عنا بعده.',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 4,
            arabic: 'اللهم أنت الصاحب في السفر، والخليفة في الأهل.',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 5,
            arabic: 'اللهم إني أعوذ بك من وعثاء السفر، وكآبة المنظر، وسوء المنقلب في المال والأهل.',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 6,
            arabic: 'أعوذ بكلمات الله التامات من شر ما خلق.',
            timing: 'عند النزول في مكان أثناء السفر',
            source: 'رواه مسلم',
            repeat: 1
          },
          {
            id: 7,
            arabic: 'اللهم رب السماوات السبع وما أظللن، ورب الأرضين وما أقللن، أسألك خير هذه القرية وخير أهلها، وأعوذ بك من شرها وشر أهلها.',
            timing: 'عند دخول بلد أو قرية',
            source: 'رواه النسائي في الكبرى',
            repeat: 1
          },
          {
            id: 8,
            arabic: 'آيبون تائبون عابدون لربنا حامدون.',
            timing: 'عند الرجوع من السفر',
            source: 'متفق عليه',
            repeat: 1
          },
          {
            id: 9,
            arabic: 'اللهم إني أسألك خير ما في هذا الطريق وخير ما بعده، وأعوذ بك من شر ما في هذا الطريق وشر ما بعده.',
            source: 'دعاء صالح',
            repeat: 1
          },
          {
            id: 10,
            arabic: 'بسم الله توكلت على الله، لا حول ولا قوة إلا بالله.',
            timing: 'عند الخروج والانطلاق',
            source: 'رواه أبو داود والترمذي',
            repeat: 1
          }
        ]
      }
    };

    const supplementalDuas = this.getSupplementalDuas();
    Object.entries(supplementalDuas).forEach(([category, extraDuas]) => {
      if (!collections[category] || !Array.isArray(extraDuas)) {
        return;
      }

      const currentDuas = collections[category].duas;
      const seenTexts = new Set(currentDuas.map((dua) => (dua.arabic || '').trim()));
      let nextId = currentDuas.reduce((maxId, dua) => Math.max(maxId, Number(dua.id) || 0), 0) + 1;

      extraDuas.forEach((dua) => {
        const text = (dua.arabic || '').trim();
        if (!text || seenTexts.has(text)) {
          return;
        }

        currentDuas.push({
          id: nextId++,
          ...dua
        });
        seenTexts.add(text);
      });
    });

    return collections;
  }

  /**
   * Additional duas to enrich all categories
   */
  static getSupplementalDuas() {
    return {
      morning: [
        {
          arabic: 'اللهم إني أصبحت أُشهدك وأُشهد حملة عرشك وملائكتك وجميع خلقك أنك أنت الله لا إله إلا أنت وحدك لا شريك لك وأن محمدًا عبدك ورسولك.',
          source: 'رواه أبو داود',
          repeat: 4
        },
        {
          arabic: 'اللهم عافني في بدني، اللهم عافني في سمعي، اللهم عافني في بصري، لا إله إلا أنت.',
          source: 'رواه أبو داود',
          repeat: 3
        },
        {
          arabic: 'اللهم إني أعوذ بك من الهم والحزن، والعجز والكسل، والبخل والجبن، وضلع الدين وغلبة الرجال.',
          source: 'رواه البخاري',
          repeat: 1
        },
        {
          arabic: 'أعوذ بكلمات الله التامات من شر ما خلق.',
          source: 'رواه مسلم',
          repeat: 3
        },
        {
          arabic: 'اللهم فاطر السماوات والأرض عالم الغيب والشهادة، رب كل شيء ومليكه، أعوذ بك من شر نفسي ومن شر الشيطان وشِركه.',
          source: 'رواه أبو داود والترمذي',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أسألك خير هذا اليوم، فتحه ونصره ونوره وبركته وهداه، وأعوذ بك من شر ما فيه وشر ما بعده.',
          source: 'دعاء مأثور',
          repeat: 1
        }
      ],
      evening: [
        {
          arabic: 'أمسينا على فطرة الإسلام وعلى كلمة الإخلاص وعلى دين نبينا محمد صلى الله عليه وسلم وعلى ملة أبينا إبراهيم حنيفًا مسلمًا وما كان من المشركين.',
          source: 'رواه أحمد',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أسألك خير هذه الليلة فتحها ونصرها ونورها وبركتها وهداها، وأعوذ بك من شر ما فيها وشر ما بعدها.',
          source: 'دعاء مأثور',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أعوذ بك من الكسل وسوء الكبر، وأعوذ بك من عذاب في النار وعذاب في القبر.',
          source: 'رواه مسلم',
          repeat: 1
        },
        {
          arabic: 'سبحان الله وبحمده عدد خلقه ورضا نفسه وزنة عرشه ومداد كلماته.',
          source: 'رواه مسلم',
          repeat: 3
        },
        {
          arabic: 'اللهم أنت ربي لا إله إلا أنت عليك توكلت وأنت رب العرش العظيم.',
          source: 'دعاء مأثور',
          repeat: 1
        },
        {
          arabic: 'اللهم اجعل لي في هذه الليلة نصيبًا من رحمتك ومغفرتك ورضوانك.',
          source: 'دعاء صالح',
          repeat: 1
        }
      ],
      protection: [
        {
          arabic: 'اللهم استر عوراتي وآمن روعاتي.',
          source: 'رواه أبو داود',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أعوذ بك من البرص والجنون والجذام ومن سيئ الأسقام.',
          source: 'رواه أبو داود',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أعوذ بك من شر سمعي ومن شر بصري ومن شر لساني ومن شر قلبي ومن شر منيّي.',
          source: 'رواه الترمذي',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أعوذ بك من الفقر والقلة والذلة، وأعوذ بك من أن أَظلِم أو أُظلَم.',
          source: 'رواه أبو داود',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أعوذ بك أن أضل أو أُضل، أو أزل أو أُزل، أو أظلم أو أُظلم، أو أجهل أو يُجهل علي.',
          source: 'رواه أبو داود والترمذي',
          repeat: 1
        },
        {
          arabic: 'اللهم احفظني بالإسلام قائمًا، واحفظني بالإسلام قاعدًا، واحفظني بالإسلام راقدًا.',
          source: 'دعاء مأثور',
          repeat: 1
        }
      ],
      forgiveness: [
        {
          arabic: 'اللهم اغفر لي ما قدمت وما أخرت، وما أسررت وما أعلنت، وما أنت أعلم به مني.',
          source: 'متفق عليه',
          repeat: 1
        },
        {
          arabic: 'اللهم اغفر لي وارحمني واهدني وعافني وارزقني.',
          source: 'رواه مسلم',
          repeat: 1
        },
        {
          arabic: 'ربنا اغفر لنا ذنوبنا وإسرافنا في أمرنا وثبّت أقدامنا وانصرنا على القوم الكافرين.',
          source: 'سورة آل عمران: 147',
          repeat: 1
        },
        {
          arabic: 'رب اغفر لي ولوالدي ولمن دخل بيتي مؤمنًا وللمؤمنين والمؤمنات.',
          source: 'سورة نوح: 28',
          repeat: 1
        },
        {
          arabic: 'اللهم تجاوز عن سيئاتي واغسل قلبي من خطاياي كما ينقى الثوب الأبيض من الدنس.',
          source: 'دعاء مأثور',
          repeat: 1
        },
        {
          arabic: 'أستغفر الله العظيم الذي لا إله إلا هو الحي القيوم وأتوب إليه.',
          source: 'رواه أبو داود',
          repeat: 10
        }
      ],
      sustenance: [
        {
          arabic: 'اللهم إني أسألك من فضلك ورحمتك فإنه لا يملكها إلا أنت.',
          source: 'رواه أبو داود',
          repeat: 1
        },
        {
          arabic: 'اللهم ارزقني من حيث لا أحتسب.',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'اللهم افتح لي أبواب رزقك، وبارك لي فيما أعطيتني.',
          source: 'دعاء مأثور',
          repeat: 1
        },
        {
          arabic: 'اللهم ارزقني رزقًا واسعًا مباركًا فيه، حلالًا طيبًا نافعًا.',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'اللهم اقض ديني، وأغنني من الفقر.',
          source: 'رواه الترمذي',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أعوذ بك من الفقر إلا إليك، وأعوذ بك من الذل إلا لك.',
          source: 'دعاء صالح',
          repeat: 1
        }
      ],
      sleep: [
        {
          arabic: 'اللهم رب السماوات ورب الأرض ورب العرش العظيم، ربنا ورب كل شيء، فالق الحب والنوى، منزل التوراة والإنجيل والفرقان، أعوذ بك من شر كل شيء أنت آخذ بناصيته.',
          source: 'رواه مسلم',
          repeat: 1
        },
        {
          arabic: 'اللهم غارت النجوم وهدأت العيون وأنت حي قيوم لا تأخذك سنة ولا نوم، يا حي يا قيوم أهدئ ليلي وأنم عيني.',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'قراءة آخر آيتين من سورة البقرة: آمن الرسول بما أنزل إليه من ربه... إلى آخر السورة.',
          source: 'متفق عليه',
          virtue: 'تكفي العبد إذا قرأهما في ليلته.',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أعوذ بوجهك الكريم وكلماتك التامة من شر ما أنت آخذ بناصيته.',
          source: 'دعاء مأثور',
          repeat: 1
        },
        {
          arabic: 'اللهم كما أحسنت خَلقي فأحسن خُلُقي، وأصلح لي شأني كله قبل منامي وبعده.',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'اللهم اجعل نومي راحةً لبدني، وسكينةً لقلبي، وطمأنينةً لنفسي.',
          source: 'دعاء صالح',
          repeat: 1
        }
      ],
      food: [
        {
          arabic: 'الحمد لله الذي أطعمني هذا ورزقنيه من غير حول مني ولا قوة.',
          timing: 'بعد الطعام',
          source: 'رواه الترمذي',
          repeat: 1
        },
        {
          arabic: 'اللهم أطعم من أطعمني واسق من سقاني.',
          timing: 'دعاء لصاحب الطعام',
          source: 'رواه مسلم',
          repeat: 1
        },
        {
          arabic: 'اللهم بارك لنا في طعامنا وشرابنا وزدنا من فضلك.',
          timing: 'قبل أو بعد الطعام',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'اللهم اجعل هذا الطعام قوةً لنا على طاعتك، ولا تجعل فيه نصيبًا للشيطان.',
          timing: 'قبل الطعام',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'اللهم اغفر لأهل هذا البيت وبارك لهم فيما رزقتهم.',
          timing: 'بعد الضيافة',
          source: 'دعاء مأثور',
          repeat: 1
        },
        {
          arabic: 'الحمد لله الذي كفانا وآوانا وأطعمنا وسقانا.',
          timing: 'بعد الطعام',
          source: 'رواه مسلم',
          repeat: 1
        }
      ],
      travel: [
        {
          arabic: 'أستودع الله دينك وأمانتك وخواتيم عملك.',
          timing: 'دعاء المقيم للمسافر',
          source: 'رواه الترمذي',
          repeat: 1
        },
        {
          arabic: 'زودك الله التقوى، وغفر ذنبك، ويسر لك الخير حيثما كنت.',
          timing: 'دعاء للمسافر',
          source: 'رواه الترمذي',
          repeat: 1
        },
        {
          arabic: 'اللهم اطوِ لنا الأرض، وهوّن علينا السفر، وسلمنا في ذهابنا وإيابنا.',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'اللهم احفظنا في سفرنا، واحفظ أهلنا في غيابنا، واكتب لنا السلامة والعافية.',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'اللهم اجعل سفرنا هذا سفرًا مباركًا، وارزقنا فيه الخير والتوفيق والقبول.',
          source: 'دعاء صالح',
          repeat: 1
        },
        {
          arabic: 'اللهم إني أسألك السلامة في السفر، والراحة في الطريق، والبركة عند الوصول.',
          source: 'دعاء صالح',
          repeat: 1
        }
      ]
    };
  }

  /**
   * Get specific dua collection
   */
  static getDuaCollection(category) {
    const collections = this.getDuaCollections();
    return collections[category] || null;
  }

  /**
   * Get random dua from specific category
   */
  static getRandomDuaByCategory(category) {
    const collection = this.getDuaCollection(category);
    if (!collection || !collection.duas || collection.duas.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * collection.duas.length);
    return collection.duas[randomIndex];
  }

  /**
   * Search for dua by keyword
   */
  static searchDua(keyword) {
    const collections = this.getDuaCollections();
    const results = [];

    Object.entries(collections).forEach(([_category, collection]) => {
      collection.duas.forEach((dua) => {
        if (
          dua.arabic.includes(keyword) ||
          collection.name.includes(keyword) ||
          dua.meaning?.includes(keyword)
        ) {
          results.push({
            category: collection.name,
            ...dua
          });
        }
      });
    });

    return results;
  }

  /**
   * Track user's dua progress
   */
  static async trackDuaProgress(userId, duaId, category) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return { success: false };

      if (!user.duaProgress) {
        user.duaProgress = {};
      }

      const today = new Date().toDateString();
      const key = `${category}_${duaId}`;

      if (!user.duaProgress[key]) {
        user.duaProgress[key] = {
          count: 0,
          lastRecited: null,
          streak: 0
        };
      }

      const progress = user.duaProgress[key];
      progress.count++;

      // Check streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();

      if (progress.lastRecited === yesterdayStr) {
        progress.streak++;
      } else if (progress.lastRecited !== today) {
        progress.streak = 1;
      }

      progress.lastRecited = today;

      // Award XP
      user.xp += 5;

      await user.save();

      return { success: true, progress };
    } catch (error) {
      console.error('Error tracking dua:', error);
      return { success: false };
    }
  }

  /**
   * Get user's dua statistics
   */
  static async getDuaStats(userId) {
    try {
      const user = await User.findOne({ userId });
      if (!user || !user.duaProgress) {
        return {
          totalRecitations: 0,
          categoriesCompleted: 0,
          longestStreak: 0,
          favoriteCategory: null
        };
      }

      let totalRecitations = 0;
      let longestStreak = 0;
      const categoryCount = {};

      Object.entries(user.duaProgress).forEach(([key, progress]) => {
        totalRecitations += progress.count;
        longestStreak = Math.max(longestStreak, progress.streak);

        const category = key.split('_')[0];
        categoryCount[category] = (categoryCount[category] || 0) + progress.count;
      });

      const favoriteCategory =
        Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      return {
        totalRecitations,
        categoriesCompleted: Object.keys(categoryCount).length,
        longestStreak,
        favoriteCategory
      };
    } catch (error) {
      console.error('Error getting dua stats:', error);
      return null;
    }
  }

  /**
   * Format dua display
   */
  static formatDua(dua, includeDetails = true) {
    let message = `🤲 <b>${dua.name || 'دعاء'}</b>\n\n`;
    message += `<b>${dua.arabic}</b>\n\n`;

    if (includeDetails) {
      if (dua.transliteration) {
        message += `📝 ${dua.transliteration}\n\n`;
      }

      if (dua.translation) {
        message += `🌏 ${dua.translation}\n\n`;
      }

      if (dua.meaning) {
        message += `💡 <b>الفائدة:</b> ${dua.meaning}\n\n`;
      }

      if (dua.virtue) {
        message += `✨ <b>الفضل:</b> ${dua.virtue}\n\n`;
      }

      if (dua.timing) {
        message += `⏰ <b>الوقت:</b> ${dua.timing}\n\n`;
      }

      if (dua.action) {
        message += `👉 <b>الكيفية:</b> ${dua.action}\n\n`;
      }

      message += `📚 <b>المصدر:</b> ${dua.source}\n`;

      if (dua.repeat && dua.repeat > 1) {
        message += `🔄 <b>التكرار:</b> ${dua.repeat} مرات`;
      }
    }

    return message;
  }

  /**
   * Format dua collection
   */
  static formatDuaCollection(collection) {
    if (!collection) return '❌ المجموعة غير موجودة';

    let message = `🤲 <b>${collection.name}</b>\n\n`;
    message += `📖 عدد الأدعية: ${collection.duas.length}\n\n`;

    collection.duas.forEach((dua, index) => {
      const preview = dua.arabic.length > 50 ? `${dua.arabic.substring(0, 50)}...` : dua.arabic;
      message += `${index + 1}. ${preview}\n`;
    });

    return message;
  }

  /**
   * Get random daily dua
   */
  static getRandomDua() {
    const collections = this.getDuaCollections();
    const allDuas = [];

    Object.values(collections).forEach((collection) => {
      allDuas.push(...collection.duas);
    });

    const randomIndex = Math.floor(Math.random() * allDuas.length);
    return allDuas[randomIndex];
  }
}

module.exports = DuaSystem;
