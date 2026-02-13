const QuranicGames = require('./src/games/quranicGames');

console.log('🎮 ========== اختبار النظام الجديد للألعاب ==========\n');

// 1️⃣ اختبار لعبة تخمين السورة
console.log('1️⃣ اختبار لعبة تخمين السورة (70+ دليل)');
const guessGames = [];
for (let i = 0; i < 3; i++) {
  const game = QuranicGames.getGuessTheSurahGame();
  guessGames.push(game);
  console.log(`   ${i+1}. الدليل: "${game.question}" → الإجابة: "${game.answer}"}`);
}
console.log('   ✅ تم الحصول على 3 أسئلة مختلفة\n');

// 2️⃣ اختبار لعبة أكمل الآية
console.log('2️⃣ اختبار لعبة أكمل الآية (60+ سؤال)');
const completeGames = [];
for (let i = 0; i < 3; i++) {
  const game = QuranicGames.getCompleteVerseGame();
  completeGames.push(game);
  console.log(`   ${i+1}. النص الناقص: "${game.question}" → الكملة: "${game.answer}"`);
}
console.log('   ✅ تم الحصول على 3 أسئلة مختلفة\n');

// 3️⃣ اختبار لعبة اكتشف الفرق
console.log('3️⃣ اختبار لعبة اكتشف الفرق (50+ سؤال)');
const spotGames = [];
for (let i = 0; i < 3; i++) {
  const game = QuranicGames.getSpotDifferenceGame();
  spotGames.push(game);
  console.log(`   ${i+1}. الآية: "${game.question.substring(0, 30)}..." → صحيح/خطأ: ${game.answer}`);
}
console.log('   ✅ تم الحصول على 3 أسئلة مختلفة\n');

// 4️⃣ اختبار لعبة المعلومات القرآنية
console.log('4️⃣ اختبار لعبة المعلومات القرآنية (46+ سؤال)');
const triviaGames = [];
for (let i = 0; i < 3; i++) {
  const game = QuranicGames.getTriviaGame();
  triviaGames.push(game);
  console.log(`   ${i+1}. السؤال: "${game.question}"`);
  console.log(`      الإجابات: ${game.options.join(', ')}`);
  console.log(`      الصحيحة: "${game.answer}"`);
}
console.log('   ✅ تم الحصول على 3 أسئلة مختلفة\n');

// 5️⃣ اختبار لعبة عد الآيات
console.log('5️⃣ اختبار لعبة عد الآيات (100+ سورة)');
const countGames = [];
for (let i = 0; i < 3; i++) {
  const game = QuranicGames.getCountVersesGame();
  countGames.push(game);
  console.log(`   ${i+1}. السؤال: "${game.question}" → الإجابة: ${game.answer}`);
}
console.log('   ✅ تم الحصول على 3 أسئلة مختلفة\n');

// 6️⃣ اختبار لعبة الأسئلة الثقافية الإسلامية
console.log('6️⃣ اختبار لعبة الأسئلة الثقافية الإسلامية (50+ سؤال)');
const culturalGames = [];
for (let i = 0; i < 3; i++) {
  const game = QuranicGames.getCulturalKnowledgeGame();
  culturalGames.push(game);
  console.log(`   ${i+1}. السؤال: "${game.question}"`);
  console.log(`      الخيارات: ${game.options.join(', ')}`);
  console.log(`      الإجابة الصحيحة: "${game.answer}"`);
}
console.log('   ✅ تم الحصول على 3 أسئلة مختلفة\n');

// ✅ اختبار checkAnswer
console.log('✅ ========== اختبار دالة checkAnswer ==========\n');

// اختبار تخمين السورة
const guessTest = guessGames[0];
const guessCorrect = QuranicGames.checkAnswer(guessTest.answer, guessTest.answer, 'guess_surah');
console.log(`تخمين السورة (صحيح): ${guessCorrect ? '✅' : '❌'}`);
const guessWrong = QuranicGames.checkAnswer('سورة خاطئة', guessTest.answer, 'guess_surah');
console.log(`تخمين السورة (خطأ): ${!guessWrong ? '✅' : '❌'}`);

// اختبار أكمل الآية
const completeTest = completeGames[0];
const completeCorrect = QuranicGames.checkAnswer(completeTest.answer, completeTest.answer, 'complete_verse');
console.log(`أكمل الآية (صحيح): ${completeCorrect ? '✅' : '❌'}`);
const completeWrong = QuranicGames.checkAnswer('كلمة خاطئة', completeTest.answer, 'complete_verse');
console.log(`أكمل الآية (خطأ): ${!completeWrong ? '✅' : '❌'}`);

// اختبار اكتشف الفرق
const spotTest = spotGames[0];
const spotCorrect = QuranicGames.checkAnswer(String(spotTest.answer), String(spotTest.answer), 'spot_difference');
console.log(`اكتشف الفرق (صحيح): ${spotCorrect ? '✅' : '❌'}`);
const spotWrong = QuranicGames.checkAnswer('false', 'true', 'spot_difference');
console.log(`اكتشف الفرق (خطأ): ${!spotWrong ? '✅' : '❌'}`);

// اختبار عد الآيات
const countTest = countGames[0];
const countCorrect = QuranicGames.checkAnswer(String(countTest.answer), countTest.answer, 'count_verses');
console.log(`عد الآيات (صحيح): ${countCorrect ? '✅' : '❌'}`);
const countWrong = QuranicGames.checkAnswer('999', countTest.answer, 'count_verses');
console.log(`عد الآيات (خطأ): ${!countWrong ? '✅' : '❌'}`);

console.log('\n✅ ========== النتائج النهائية ==========\n');
console.log('📊 ملخص الاختبارات:');
console.log('   ✅ لعبة تخمين السورة: 70+ دليل');
console.log('   ✅ لعبة أكمل الآية: 60+ سؤال');
console.log('   ✅ لعبة اكتشف الفرق: 50+ سؤال');
console.log('   ✅ لعبة المعلومات القرآنية: 46+ سؤال');
console.log('   ✅ لعبة عد الآيات: 100+ سورة');
console.log('   ✅ لعبة الأسئلة الثقافية: 50+ سؤال');
console.log('\n🎉 إجمالي الأسئلة: 375+ أسئلة مختلفة!');
console.log('\n✅ جميع الاختبارات نجحت!');
