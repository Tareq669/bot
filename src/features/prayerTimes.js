const axios = require('axios');
const NodeCache = require('node-cache');
const { User } = require('../database/models');

// Cache for 12 hours
const cache = new NodeCache({ stdTTL: 43200 });

class PrayerTimesManager {
  /**
   * Get prayer times for a city
   * @param {string} city - City name in Arabic or English
   * @param {string} country - Country code (e.g., 'SA', 'EG')
   */
  static async getPrayerTimes(city = 'Riyadh', country = 'SA') {
    const cacheKey = `prayer_${city}_${country}`;
    const cached = cache.get(cacheKey);

    if (cached) return cached;

    try {
      // Using Aladhan API for Islamic prayer times
      const response = await axios.get('http://api.aladhan.com/v1/timingsByCity', {
        params: {
          city,
          country,
          method: 4 // Umm Al-Qura University, Makkah
        }
      });

      if (response.data.code === 200) {
        const timings = response.data.data.timings;
        const date = response.data.data.date;

        const prayerData = {
          date: {
            hijri: date.hijri.date,
            gregorian: date.gregorian.date,
            readable: date.readable
          },
          timings: {
            Fajr: timings.Fajr,
            Sunrise: timings.Sunrise,
            Dhuhr: timings.Dhuhr,
            Asr: timings.Asr,
            Maghrib: timings.Maghrib,
            Isha: timings.Isha,
            Midnight: timings.Midnight,
            Imsak: timings.Imsak
          },
          city,
          country
        };

        cache.set(cacheKey, prayerData);
        return prayerData;
      }

      return null;
    } catch (error) {
      console.error('Prayer times error:', error.message);
      return null;
    }
  }

  /**
   * Format prayer times for display
   */
  static formatPrayerTimes(data) {
    if (!data) return '❌ لم نتمكن من الحصول على أوقات الصلاة';

    const { timings, date, city } = data;

    let message = '🕌 <b>أوقات الصلاة</b>\n\n';
    message += `📍 المدينة: ${city}\n`;
    message += `📅 ${date.hijri} هـ\n`;
    message += `📆 ${date.gregorian} م\n\n`;

    message += `🌅 <b>الفجر:</b> ${timings.Fajr}\n`;
    message += `☀️ <b>الشروق:</b> ${timings.Sunrise}\n`;
    message += `🌤️ <b>الظهر:</b> ${timings.Dhuhr}\n`;
    message += `🌥️ <b>العصر:</b> ${timings.Asr}\n`;
    message += `🌆 <b>المغرب:</b> ${timings.Maghrib}\n`;
    message += `🌙 <b>العشاء:</b> ${timings.Isha}\n\n`;
    message += `🌃 <b>منتصف الليل:</b> ${timings.Midnight}`;

    return message;
  }

  /**
   * Get next prayer time
   */
  static getNextPrayer(timings) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const prayers = [
      { name: 'الفجر', time: timings.Fajr, icon: '🌅' },
      { name: 'الظهر', time: timings.Dhuhr, icon: '🌤️' },
      { name: 'العصر', time: timings.Asr, icon: '🌥️' },
      { name: 'المغرب', time: timings.Maghrib, icon: '🌆' },
      { name: 'العشاء', time: timings.Isha, icon: '🌙' }
    ];

    for (const prayer of prayers) {
      if (prayer.time > currentTime) {
        return prayer;
      }
    }

    // If no prayer left today, return Fajr
    return prayers[0];
  }

  /**
   * Set user's location for prayer times
   */
  static async setUserLocation(userId, city, country) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      user.preferences = user.preferences || {};
      user.preferences.location = { city, country };
      await user.save();
      return true;
    } catch (error) {
      console.error('Set location error:', error);
      return false;
    }
  }

  /**
   * Get user's prayer times based on their location
   */
  static async getUserPrayerTimes(userId) {
    try {
      const user = await User.findOne({ userId });
      const location = user?.preferences?.location;

      const city = location?.city || 'Riyadh';
      const country = location?.country || 'SA';

      return await this.getPrayerTimes(city, country);
    } catch (error) {
      console.error('Get user prayer times error:', error);
      return await this.getPrayerTimes(); // Default
    }
  }

  /**
   * Enable/disable prayer notifications for user
   */
  static async togglePrayerNotifications(userId, enabled) {
    try {
      const user = await User.findOne({ userId });
      if (!user) return false;

      user.preferences = user.preferences || {};
      user.preferences.prayerNotifications = enabled;
      await user.save();
      return true;
    } catch (error) {
      console.error('Toggle prayer notifications error:', error);
      return false;
    }
  }
}

module.exports = PrayerTimesManager;
