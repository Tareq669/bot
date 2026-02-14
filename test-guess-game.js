/**
 * اختبار لعبة التخمين
 */

const GuessNumberGame = require('./src/games/guessNumberGame');

console.log('🎮 اختبار نظام لعبة التخمين\n');

// محاكاة context
const mockCtx = {
  from: { id: 123456 },
  session: {},
  reply: async (message, options) => {
    console.log('📤 الرد:', message.substring(0, 80));
  },
  editMessageText: async (message, options) => {
    console.log('✏️ تعديل:', message.substring(0, 80));
  },
  answerCbQuery: async (message) => {
    console.log('✅ إشعار:', message);
  }
};

async function runTest() {
  try {
    console.log('1️⃣ بدء اللعبة...');
    await GuessNumberGame.startGame(mockCtx);

    const gameState = mockCtx.session.guessGame;
    console.log('✅ تم بدء اللعبة');
    console.log(`📊 الرقم السري: ${gameState.number}`);
    console.log(`📊 الحالة:', ${JSON.stringify(gameState)}\n`);

    // اختبار تخمينات مختلفة
    console.log('2️⃣ اختبار التخمينات...');

    // تخمين منخفض
    console.log('\n📝 التخمين الأول: 10');
    await GuessNumberGame.processGuess(mockCtx, '10');

    // تخمين عالي
    console.log('\n📝 التخمين الثاني: 90');
    await GuessNumberGame.processGuess(mockCtx, '90');

    // تخمين صحيح
    console.log(`\n📝 التخمين الصحيح: ${gameState.number}`);
    await GuessNumberGame.processGuess(mockCtx, String(gameState.number));

    console.log('\n✅ الاختبار انتهى بنجاح!');
  } catch (error) {
    console.error('❌ خطأ في الاختبار:', error);
  }
}

runTest();
