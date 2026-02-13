/**
 * اختبار إصلاح لعبة الأسئلة الثقافية النهائي
 */

console.log(`\n${  '='.repeat(80)}`);
console.log('🧪 اختبار الإصلاح النهائي');
console.log(`${'='.repeat(80)  }\n`);

// محاكاة معالجة الإجابة
function testAnswer(userAnswer, expectedIndex) {
  let userIndex = -1;
  const cleanAnswer = String(userAnswer).trim().toUpperCase();

  console.log(`\n📝 الإجابة: "${userAnswer}"`);
  console.log(`   تنظيف: "${cleanAnswer}"`);
  console.log(`   الطول: ${cleanAnswer.length}`);

  // التحقق من الأحرف (A, B, C, D)
  if (cleanAnswer.length === 1 && cleanAnswer >= 'A' && cleanAnswer <= 'D') {
    userIndex = cleanAnswer.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
    console.log(`   ✅ حرف: userIndex = ${userIndex}`);
  }
  // التحقق من الأرقام (1, 2, 3, 4)
  else if (cleanAnswer.length === 1 && cleanAnswer >= '1' && cleanAnswer <= '4') {
    userIndex = parseInt(cleanAnswer) - 1; // 1→0, 2→1, 3→2, 4→3
    console.log(`   ✅ رقم: userIndex = ${userIndex}`);
  }
  else {
    console.log(`   ❌ غير مدعوم: userIndex = ${userIndex}`);
  }

  const result = userIndex === expectedIndex ? '✅' : '❌';
  console.log(`   ${result} المتوقع: ${expectedIndex}, الفعلي: ${userIndex}`);

  return userIndex === expectedIndex;
}

console.log('🔍 اختبار الإجابات الصحيحة (expectedIndex = 0):\n');

const tests = [
  'A',   // ✅
  'a',   // ✅
  '1',   // ✅
  'B',   // ❌
  'b',   // ❌
  '2',   // ❌
  'AA',  // ❌ (طول > 1)
  '11'  // ❌ (طول > 1)
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
  const isCorrect = testAnswer(test, 0);
  if (isCorrect) passed++;
  else failed++;
});

console.log(`\n${  '='.repeat(80)}`);
console.log('📊 النتائج:');
console.log('='.repeat(80));
console.log(`✅ نجح: ${passed}`);
console.log(`❌ فشل: ${failed}`);
console.log(`${'='.repeat(80)  }\n`);
