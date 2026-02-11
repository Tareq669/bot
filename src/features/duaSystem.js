const { User } = require('../database/models');

class DuaSystem {
  /**
   * Comprehensive Dua Collection
   */
  static getDuaCollections() {
    return {
      'morning': {
        name: 'أذكار الصباح',
        duas: [
          {
            id: 1,
            arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
            transliteration: 'Asbahna wa asbaha almulku lillahi walhamdu lillah',
            translation: 'We have entered the morning and the dominion belongs to Allah and praise belongs to Allah',
            source: 'مسلم',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
            transliteration: 'Allahumma bika asbahna wa bika amsayna',
            translation: 'O Allah, by You we have reached the morning and by You we reach the evening',
            source: 'الترمذي',
            repeat: 1
          },
          {
            id: 3,
            arabic: 'أَصْبَحْنَا عَلَى فِطْرَةِ الإِسْلاَمِ، وَعَلَى كَلِمَةِ الإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
            source: 'أحمد',
            repeat: 1
          }
        ]
      },
      'evening': {
        name: 'أذكار المساء',
        duas: [
          {
            id: 1,
            arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ',
            source: 'مسلم',
            repeat: 1
          }
        ]
      },
      'protection': {
        name: 'أدعية الحماية والحفظ',
        duas: [
          {
            id: 1,
            arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
            meaning: 'للحماية من كل شر',
            source: 'مسلم',
            repeat: 3
          },
          {
            id: 2,
            arabic: 'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ',
            meaning: 'من الهم والحزن',
            source: 'البخاري',
            repeat: 1
          }
        ]
      },
      'forgiveness': {
        name: 'أدعية المغفرة والتوبة',
        duas: [
          {
            id: 1,
            arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
            name: 'سيد الاستغفار',
            source: 'البخاري',
            virtue: 'من قالها موقناً بها فمات من يومه دخل الجنة',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
            virtue: 'غفر له وإن كان فر من الزحف',
            source: 'أبو داود',
            repeat: 3
          }
        ]
      },
      'sustenance': {
        name: 'أدعية الرزق',
        duas: [
          {
            id: 1,
            arabic: 'اللَّهُمَّ اكْفِنِي بِحَلَالِكَ عَنْ حَرَامِكَ وَأَغْنِنِي بِفَضْلِكَ عَمَّنْ سِوَاكَ',
            source: 'الترمذي',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
            source: 'ابن ماجه',
            repeat: 1
          }
        ]
      },
      'sleep': {
        name: 'أدعية النوم',
        duas: [
          {
            id: 1,
            arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
            source: 'البخاري',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
            action: 'يقال عند وضع اليد تحت الخد الأيمن',
            source: 'أبو داود',
            repeat: 3
          }
        ]
      },
      'food': {
        name: 'أدعية الطعام',
        duas: [
          {
            id: 1,
            arabic: 'بِسْمِ اللَّهِ',
            timing: 'قبل الطعام',
            source: 'البخاري',
            repeat: 1
          },
          {
            id: 2,
            arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ',
            timing: 'بعد الطعام',
            source: 'أبو داود',
            repeat: 1
          }
        ]
      },
      'travel': {
        name: 'أدعية السفر',
        duas: [
          {
            id: 1,
            arabic: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ',
            source: 'الترمذي',
            repeat: 1
          }
        ]
      }
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
   * Search for dua by keyword
   */
  static searchDua(keyword) {
    const collections = this.getDuaCollections();
    const results = [];

    Object.entries(collections).forEach(([category, collection]) => {
      collection.duas.forEach(dua => {
        if (dua.arabic.includes(keyword) ||
            collection.name.includes(keyword) ||
            dua.meaning?.includes(keyword)) {
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

      const favoriteCategory = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

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
      message += `${index + 1}. ${dua.arabic.substring(0, 50)}...\n`;
    });

    return message;
  }

  /**
   * Get random daily dua
   */
  static getRandomDua() {
    const collections = this.getDuaCollections();
    const allDuas = [];

    Object.values(collections).forEach(collection => {
      allDuas.push(...collection.duas);
    });

    const randomIndex = Math.floor(Math.random() * allDuas.length);
    return allDuas[randomIndex];
  }
}

module.exports = DuaSystem;
