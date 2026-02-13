const QuranicGames = require('./src/games/quranicGames');

(async () => {
  try {
    console.log('=== Testing Quranic Games ===\n');

    const game1 = await QuranicGames.completeTheVerse();
    console.log('✅ completeTheVerse:');
    console.log(JSON.stringify(game1, null, 2));
    console.log('\n');

    const game2 = await QuranicGames.spotTheDifference();
    console.log('✅ spotTheDifference:');
    console.log(JSON.stringify(game2, null, 2));
    console.log('\n');

    const game3 = await QuranicGames.qurranTrivia();
    console.log('✅ qurranTrivia:');
    console.log(JSON.stringify(game3, null, 2));
    console.log('\n');

    const game4 = await QuranicGames.surahCount();
    console.log('✅ surahCount:');
    console.log(JSON.stringify(game4, null, 2));
    console.log('\n');

    console.log('=== All tests passed! ===');
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
