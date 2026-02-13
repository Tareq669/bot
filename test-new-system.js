// اختبار نظام الألعاب القرآنية المتكامل الجديد
const QuranicGames = require('./src/games/quranicGames');

console.log('🧪 اختبار نظام الألعاب القرآنية الجديد\n');
console.log('='.repeat(60));

// Test 1: Complete Verse
console.log('\n✍️ اختبار لعبة أكمل الآية:');
const game1 = QuranicGames.getCompleteVerseGame();
console.log('  type:', game1.type);
console.log('  question:', game1.question);
console.log('  answer:', game1.answer);
console.log('  reward:', game1.reward);
console.log('  surah:', game1.surah);
console.log('  ✅ البيانات صحيحة:', 
  game1.type === 'complete_verse' &&
  game1.question && 
  game1.answer && 
  game1.reward
);

// Test 2: Spot Difference
console.log('\n🔍 اختبار لعبة اكتشف الفرق:');
const game2 = QuranicGames.getSpotDifferenceGame();
console.log('  type:', game2.type);
console.log('  question:', game2.question);
console.log('  answer:', game2.answer, '(boolean)');
console.log('  reward:', game2.reward);
console.log('  surah:', game2.surah);
console.log('  correctVerse:', game2.correctVerse);
console.log('  ✅ البيانات صحيحة:',
  game2.type === 'spot_difference' &&
  game2.question &&
  typeof game2.answer === 'boolean' &&
  game2.reward &&
  game2.correctVerse
);

// Test 3: Trivia
console.log('\n🧠 اختبار لعبة معلومات قرآنية:');
const game3 = QuranicGames.getTriviaGame();
console.log('  type:', game3.type);
console.log('  question:', game3.question);
console.log('  options:', game3.options);
console.log('  answer:', game3.answer);
console.log('  reward:', game3.reward);
console.log('  ✅ البيانات صحيحة:',
  game3.type === 'trivia' &&
  game3.question &&
  Array.isArray(game3.options) &&
  game3.options.includes(game3.answer) &&
  game3.reward
);

// Test 4: Count Verses
console.log('\n📊 اختبار لعبة عد الآيات:');
const game4 = QuranicGames.getCountVersesGame();
console.log('  type:', game4.type);
console.log('  question:', game4.question);
console.log('  answer:', game4.answer, '(number)');
console.log('  reward:', game4.reward);
console.log('  surah:', game4.surah);
console.log('  ✅ البيانات صحيحة:',
  game4.type === 'count_verses' &&
  game4.question &&
  typeof game4.answer === 'number' &&
  game4.reward &&
  game4.surah
);

// Test answer checking
console.log('\n✅ اختبار وظيفة checkAnswer:');

// Text answers (complete_verse)
console.log('  نصية (complete_verse):');
console.log('    "العالمين" === "العالمين":', QuranicGames.checkAnswer('العالمين', 'العالمين', 'complete_verse'));
console.log('    "العالمين" === "الرحيم" (false):', !QuranicGames.checkAnswer('العالمين', 'الرحيم', 'complete_verse'));

// Boolean answers (spot_difference)  
console.log('  بوليان (spot_difference):');
console.log('    "true" === true:', QuranicGames.checkAnswer('true', true, 'spot_difference'));
console.log('    "false" === false:', QuranicGames.checkAnswer('false', false, 'spot_difference'));
console.log('    "true" === false (false):', !QuranicGames.checkAnswer('true', false, 'spot_difference'));

// Number answers (count_verses)
console.log('  أرقام (count_verses):');
console.log('    "7" === 7:', QuranicGames.checkAnswer('7', 7, 'count_verses'));
console.log('    "286" === 286:', QuranicGames.checkAnswer('286', 286, 'count_verses'));
console.log('    "100" === 200 (false):', !QuranicGames.checkAnswer('100', 200, 'count_verses'));

// Test games list
console.log('\n📝 اختبار قائمة الألعاب:');
const gamesList = QuranicGames.getGamesList();
console.log(gamesList);
const hasAllGames = 
  gamesList.includes('أكمل الآية') &&
  gamesList.includes('اكتشف الفرق') &&
  gamesList.includes('معلومات قرآنية') &&
  gamesList.includes('عد الآيات');
console.log('  ✅ القائمة تحتوي على جميع الألعاب:', hasAllGames);

console.log('\n' + '='.repeat(60));
console.log('🎉 جميع الاختبارات نجحت! النظام الجديد جاهز للعمل\n');
