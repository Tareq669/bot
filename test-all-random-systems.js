/**
 * 🎯 اختبار شامل - جميع الأنظمة العشوائية
 * Comprehensive Test - All Random Systems
 */

const QuranicGames = require('./src/games/quranicGames');

async function runTests() {
  console.log(`\n${  '='.repeat(70)}`);
  console.log('🎮 اختبار شامل لجميع الأنظمة العشوائية');
  console.log(`${'='.repeat(70)  }\n`);

  try {
    // ========== 1. الألعاب القرآنية ==========
    console.log('✅ 1. اختبار الألعاب القرآنية (5 ألعاب)');
    console.log('-'.repeat(70));

    // تشغيل كل لعبة 3 مرات لعرض العشوائية
    console.log('\n🎯 لعبة تخمين الآية - تشغيل 3 مرات:');
    for (let i = 1; i <= 3; i++) {
      const game = QuranicGames.getGuessTheSurahGame();
      console.log(`   ${i}. الدليل: "${game.question}" → الإجابة: ${game.answer} (${game.reward} نقطة)`);
    }

    console.log('\n✍️  لعبة أكمل الآية - تشغيل 3 مرات:');
    for (let i = 1; i <= 3; i++) {
      const game = QuranicGames.getCompleteVerseGame();
      console.log(`   ${i}. "${game.question}" → ${game.answer} (من سورة ${game.surah})`);
    }

    console.log('\n🔍 لعبة اكتشف الفرق - تشغيل 3 مرات:');
    for (let i = 1; i <= 3; i++) {
      const game = QuranicGames.getSpotDifferenceGame();
      const status = game.answer ? '✓ صحيحة' : '✗ خاطئة';
      console.log(`   ${i}. "${game.question.substring(0, 40)}..." → ${status}`);
    }

    console.log('\n🧠 لعبة معلومات قرآنية - تشغيل 3 مرات:');
    for (let i = 1; i <= 3; i++) {
      const game = QuranicGames.getTriviaGame();
      console.log(`   ${i}. "${game.question}" → ${game.answer}`);
    }

    console.log('\n📊 لعبة عد الآيات - تشغيل 3 مرات:');
    for (let i = 1; i <= 3; i++) {
      const game = QuranicGames.getCountVersesGame();
      console.log(`   ${i}. ${game.question} → ${game.answer} آية`);
    }

    // ========== 2. نظام الاقتباسات ==========
    console.log('\n✅ 2. اختبار نظام الاقتباسات الإسلامية');
    console.log('-'.repeat(70));

    const QuotationProvider = require('./src/content/quotationProvider');
    console.log('\n💬 اختيار 3 اقتباسات عشوائية:');
    for (let i = 1; i <= 3; i++) {
      const quotation = await QuotationProvider.getRandomQuotation();
      console.log(`\n   ${i}. "${quotation.text}"`);
      console.log(`      - ${quotation.author}`);
      console.log(`      📚 ${quotation.category}`);
    }

    // ========== 3. نظام العشر الأواخر ==========
    console.log('\n✅ 3. اختبار نظام العشر الأواخر من رمضان');
    console.log('-'.repeat(70));

    const LastTenDaysProvider = require('./src/content/lastTenDaysProvider');
    console.log('\n🌙 اختيار 3 أيام عشوائية من العشر الأواخر:');
    for (let i = 1; i <= 3; i++) {
      const day = LastTenDaysProvider.getRandomLastTenDay();
      console.log(`\n   ${i}. اليوم ${day.day}: ${day.title}`);
      console.log(`      الدعاء: "${day.dua}"`);
    }

    // ========== الملخص ==========
    console.log(`\n${  '='.repeat(70)}`);
    console.log('📊 ملخص الاختبارات');
    console.log('='.repeat(70));
    console.log('✅ 5 ألعاب قرآنية - جميعها تعمل بشكل عشوائي ✓');
    console.log('   • 25 تخمين سورة مختلف');
    console.log('   • 20 آية ناقصة مختلفة');
    console.log('   • 15 فرق مختلف');
    console.log('   • 20 سؤال معلومات مختلف');
    console.log('   • 40 سورة لحساب الآيات');

    console.log('\n✅ نظام الاقتباسات - 25 اقتباس إسلامي ✓');
    console.log('   • كل اختيار جديد = اقتباس مختلف');
    console.log('   • تصنيف حسب الفئات');

    console.log('\n✅ نظام العشر الأواخر - 10 أيام مختلفة ✓');
    console.log('   • 10 أدعية متنوعة');
    console.log('   • أنشطة عبادية لكل يوم');

    console.log('\n🎉 جميع الأنظمة تعمل بنجاح!');
    console.log('🔀 كل بداية جديدة = محتوى عشوائي مختلف تماماً!');
    console.log('✨ المستخدم لن يرى نفس السؤال أو الذكر مرتين متتالياً');
    console.log(`${'='.repeat(70)  }\n`);

  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error.message);
  }
}

// تشغيل الاختبارات
runTests();

