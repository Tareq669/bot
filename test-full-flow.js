// محاكاة تدفق اللعبة الكامل
const QuranicGames = require('./src/games/quranicGames');

async function simulateGameFlow(gameName, gameFunction, gameType) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎮 Testing: ${gameName}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // Step 1: Start game
    console.log('\n📍 Step 1: بدء اللعبة');
    const game = await gameFunction();
    console.log('   Game data:', JSON.stringify(game, null, 2));

    // Step 2: Create gameState (simulate what handler does)
    console.log('\n📍 Step 2: إنشاء gameState');
    let gameState;

    if (gameType === 'complete_verse') {
      gameState = {
        game: 'quranic',
        type: 'complete_verse',
        correctAnswer: game.correctAnswer,
        reward: game.reward,
        surah: game.surah
      };
    } else if (gameType === 'spot_difference') {
      gameState = {
        game: 'quranic',
        type: 'spot_difference',
        isCorrect: game.isCorrect,
        correctAnswer: game.isCorrect.toString(),
        correctVerse: game.correctVerse,
        reward: game.reward,
        surah: game.surah
      };
    } else if (gameType === 'trivia') {
      gameState = {
        game: 'quranic',
        type: 'trivia',
        correctAnswer: game.options[game.correctAnswer],
        reward: game.reward
      };
    } else if (gameType === 'surah_count') {
      gameState = {
        game: 'quranic',
        type: 'surah_count',
        correctAnswer: game.correctAnswer,
        reward: game.reward,
        surah: game.surah
      };
    }

    console.log('   GameState:', JSON.stringify(gameState, null, 2));

    // Step 3: Validate (simulate processQuranicAnswer validation)
    console.log('\n📍 Step 3: التحقق من صحة البيانات');
    const hasCorrectAnswer = gameState.correctAnswer !== undefined && gameState.correctAnswer !== null;
    const hasReward = gameState.reward !== undefined;

    console.log(`   correctAnswer exists: ${hasCorrectAnswer ? '✅' : '❌'}`);
    console.log(`   correctAnswer value: "${gameState.correctAnswer}" (type: ${typeof gameState.correctAnswer})`);
    console.log(`   reward exists: ${hasReward ? '✅' : '❌'}`);
    console.log(`   reward value: ${gameState.reward}`);

    if (!hasCorrectAnswer || !hasReward) {
      console.log('   ❌ VALIDATION FAILED - THIS WOULD SHOW "undefined" ERROR!');
      return false;
    }

    // Step 4: Process answer
    console.log('\n📍 Step 4: معالجة الإجابة الصحيحة');
    const reward = gameState.reward;
    const resultMessage = `✅ إجابة صحيحة!\n\n🎉 لقد فزت بـ ${reward} نقطة!`;
    console.log('   Result message:', resultMessage);

    // Check if message contains undefined
    if (resultMessage.includes('undefined')) {
      console.log('   ❌ MESSAGE CONTAINS "undefined"!');
      return false;
    }

    // Step 5: Create "play again" button
    console.log('\n📍 Step 5: زر اللعب مرة أخرى');
    const playAgainAction = `qgame:${gameState.type}`;
    console.log(`   Button action: ${playAgainAction}`);

    // Check if action is defined in handlers
    const validActions = ['qgame:complete_verse', 'qgame:spot_difference', 'qgame:trivia', 'qgame:surah_count'];
    const actionIsValid = validActions.includes(playAgainAction);
    console.log(`   Action is valid: ${actionIsValid ? '✅' : '❌'}`);

    if (!actionIsValid) {
      console.log(`   ❌ INVALID ACTION - Handler for "${playAgainAction}" might not exist!`);
      return false;
    }

    console.log('\n✅ جميع الخطوات نجحت!');
    return true;

  } catch (error) {
    console.error('\n❌ خطأ:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 بدء محاكاة اللعبة الكاملة');

  const tests = [
    { name: 'أكمل الآية', fn: () => QuranicGames.completeTheVerse(), type: 'complete_verse' },
    { name: 'اكتشف الفرق', fn: () => QuranicGames.spotTheDifference(), type: 'spot_difference' },
    { name: 'معلومات قرآنية', fn: () => QuranicGames.qurranTrivia(), type: 'trivia' },
    { name: 'عد الآيات', fn: () => QuranicGames.surahCount(), type: 'surah_count' }
  ];

  const results = [];

  for (const test of tests) {
    const result = await simulateGameFlow(test.name, test.fn, test.type);
    results.push({ name: test.name, passed: result });
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 النتائج النهائية');
  console.log(`${'='.repeat(60)}`);

  results.forEach(r => {
    console.log(`${r.passed ? '✅' : '❌'} ${r.name}`);
  });

  const allPassed = results.every(r => r.passed);
  console.log(`\n${allPassed ? '🎉 جميع الاختبارات نجحت!' : '⚠️  بعض الاختبارات فشلت'}`);
}

runAllTests().catch(console.error);
