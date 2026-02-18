const QuranProvider = require('./quranProvider');

class KhatmaProvider {
  // Total pages in standard mushaf
  static totalPages() {
    return 604;
  }

  // Basic page info: percent and a sample verse to guide the user
  static async getPageInfo(page) {
    const total = this.totalPages();
    const normalized = Math.max(1, Math.min(total, Number(page) || 1));
    const percent = Math.round((normalized / total) * 100);
    // Attempt to read precise map if provided (file: pageMap.json)
    let map = null;
    try {
      map = require('./pageMap.json');
    } catch (e) {
      try { map = require('./pageMap.sample.json'); } catch (e2) { map = null; }
    }

    let surahHint = null;
    if (map && map[normalized]) {
      surahHint = map[normalized];
    }

    // Use a sample verse as fallback inspirational marker
    const sampleVerse = await QuranProvider.getRandomVerse();

    return {
      page: normalized,
      totalPages: total,
      percent,
      sample: sampleVerse,
      guidance: `اقرأ الصفحة ${normalized} من المصحف اليوم. هدف الختمة: إكمال ${total} صفحة.`,
      surahHint
    };
  }

  // Advance pages for a user object (mutates user.khatmaProgress)
  static async advancePages(user, delta = 1) {
    if (!user) throw new Error('User required');
    
    // Ensure khatmaProgress exists and has all required properties
    if (!user.khatmaProgress) {
      user.khatmaProgress = {
        currentPage: 1,
        percentComplete: 0,
        startDate: new Date(),
        lastRead: null,
        completionCount: 0,
        daysActive: 0
      };
    }
    
    // Ensure all properties exist
    if (user.khatmaProgress.currentPage === undefined) user.khatmaProgress.currentPage = 1;
    if (user.khatmaProgress.percentComplete === undefined) user.khatmaProgress.percentComplete = 0;
    if (user.khatmaProgress.startDate === undefined) user.khatmaProgress.startDate = new Date();
    if (user.khatmaProgress.completionCount === undefined) user.khatmaProgress.completionCount = 0;
    
    const total = this.totalPages();
    const current = user.khatmaProgress.currentPage || 1;
    const next = Math.min(total, current + Number(delta));
    user.khatmaProgress.currentPage = next;
    user.khatmaProgress.percentComplete = Math.round((next / total) * 100);
    user.khatmaProgress.lastRead = new Date();
    if (next === total) {
      user.khatmaProgress.completionCount = (user.khatmaProgress.completionCount || 0) + 1;
      user.khatmaProgress.endDate = new Date();
    }
    return user;
  }

  static async resetKhatma(user) {
    if (!user) throw new Error('User required');
    
    // Ensure khatmaProgress exists
    if (!user.khatmaProgress) {
      user.khatmaProgress = {};
    }
    
    // Preserve completionCount if it exists
    const completionCount = user.khatmaProgress.completionCount || 0;
    
    user.khatmaProgress.currentPage = 1;
    user.khatmaProgress.percentComplete = 0;
    user.khatmaProgress.startDate = new Date();
    user.khatmaProgress.lastRead = null;
    user.khatmaProgress.completionCount = completionCount;
    user.khatmaProgress.daysActive = 0;
    return user;
  }
}

module.exports = KhatmaProvider;
