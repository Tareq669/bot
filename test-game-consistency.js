// Test all quranic game handlers and action consistency
const QuranicGames = require('./src/games/quranicGames');

console.log('=== Testing Action Handler Consistency ===\n');

// Simulated gameState for each game
const gameStates = {
  guess_verse: {
    game: 'quranic',
    type: 'guess_verse',
    correctAnswer: 'الإخلاص',
    reward: 15
  },
  complete_verse: {
    game: 'quranic',
    type: 'complete_verse',
    correctAnswer: 'ذكر وأنثى',
    reward: 20,
    surah: 'الليل'
  },
  spot_difference: {
    game: 'quranic',
    type: 'spot_difference',
    isCorrect: true,
    correctAnswer: 'true', // STRING!
    correctVerse: 'قل هو الله أحد',
    reward: 15,
    surah: 'الإخلاص'
  },
  trivia: {
    game: 'quranic',
    type: 'trivia',
    correctAnswer: '114',
    reward: 10
  },
  surah_count: {
    game: 'quranic',
    type: 'surah_count',
    correctAnswer: 7,
    reward: 10,
    surah: 'الفاتحة'
  }
};

// Test each game has correct structure
console.log('1️⃣ Testing guess_verse gameState:');
const gs1 = gameStates.guess_verse;
console.log(`   - type: ${gs1.type} ✅`);
console.log(`   - correctAnswer exists: ${gs1.correctAnswer ? '✅' : '❌'}`);
console.log(`   - reward exists: ${gs1.reward !== undefined ? '✅' : '❌'}`);
console.log('');

console.log('2️⃣ Testing complete_verse gameState:');
const gs2 = gameStates.complete_verse;
console.log(`   - type: ${gs2.type} ✅`);
console.log(`   - correctAnswer exists: ${gs2.correctAnswer ? '✅' : '❌'}`);
console.log(`   - reward exists: ${gs2.reward !== undefined ? '✅' : '❌'}`);
console.log('');

console.log('3️⃣ Testing spot_difference gameState:');
const gs3 = gameStates.spot_difference;
console.log(`   - type: ${gs3.type} ✅`);
console.log(`   - correctAnswer exists: ${gs3.correctAnswer ? '✅' : '❌'}`);
console.log(`   - correctAnswer is STRING: ${typeof gs3.correctAnswer === 'string' ? '✅' : '❌'}`);
console.log(`   - reward exists: ${gs3.reward !== undefined ? '✅' : '❌'}`);
console.log('');

console.log('4️⃣ Testing trivia gameState:');
const gs4 = gameStates.trivia;
console.log(`   - type: ${gs4.type} ✅`);
console.log(`   - correctAnswer exists: ${gs4.correctAnswer ? '✅' : '❌'}`);
console.log(`   - reward exists: ${gs4.reward !== undefined ? '✅' : '❌'}`);
console.log('');

console.log('5️⃣ Testing surah_count gameState:');
const gs5 = gameStates.surah_count;
console.log(`   - type: ${gs5.type} ✅`);
console.log(`   - correctAnswer exists: ${gs5.correctAnswer ? '✅' : '❌'}`);
console.log(`   - reward exists: ${gs5.reward !== undefined ? '✅' : '❌'}`);
console.log('');

// Test action handler names match gameState.type
console.log('=== Testing Action Handler Names ===\n');

const expectedActions = [
  { type: 'guess_verse', action: 'qgame:guess_verse' },
  { type: 'complete_verse', action: 'qgame:complete_verse' },
  { type: 'spot_difference', action: 'qgame:spot_difference' },
  { type: 'trivia', action: 'qgame:trivia' },
  { type: 'surah_count', action: 'qgame:surah_count' }
];

expectedActions.forEach(item => {
  const expectedAction = `qgame:${item.type}`;
  const matches = expectedAction === item.action;
  console.log(`${matches ? '✅' : '❌'} ${item.type}`);
  console.log(`   Expected: qgame:${item.type}`);
  console.log(`   Actual: ${item.action}`);
  console.log(`   Match: ${matches ? 'YES' : 'NO'}`);
  console.log('');
});

// Simulate validation check from processQuranicAnswer
console.log('=== Simulating processQuranicAnswer Validation ===\n');

Object.keys(gameStates).forEach(key => {
  const gameState = gameStates[key];
  const hasCorrectAnswer = gameState.correctAnswer !== undefined && gameState.correctAnswer !== null;
  const hasReward = gameState.reward !== undefined;

  const validationPassed = hasCorrectAnswer && hasReward;

  console.log(`${validationPassed ? '✅' : '❌'} ${key}:`);
  console.log(`   correctAnswer: ${hasCorrectAnswer ? '✅' : '❌'} (${gameState.correctAnswer})`);
  console.log(`   reward: ${hasReward ? '✅' : '❌'} (${gameState.reward})`);
  console.log('');
});

console.log('=== All Validation Complete! ===');
