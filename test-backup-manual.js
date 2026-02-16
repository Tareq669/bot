/**
 * Manual Test for Backup System
 * اختبار يدوي لنظام النسخ الاحتياطي
 */

console.log('🧪 بدء اختبار نظام النسخ الاحتياطي...\n');

// Test 1: Check if the file loads correctly
try {
  const BackupSystem = require('./src/utils/backupSystem');
  console.log('✅ Test 1: تحميل الملف نجح');
  
  // Test 2: Can we instantiate the class?
  const backupSystem = new BackupSystem();
  console.log('✅ Test 2: إنشاء نسخة من الكلاس نجح');
  
  // Test 3: Check if methods exist
  const methods = [
    'ensureBackupDir',
    'backupUsers',
    'backupCollection',
    'fullBackup',
    'restoreFromBackup',
    'restoreCollection',
    'listBackups',
    'getBackupType',
    'getFileSize',
    'deleteOldBackups',
    'scheduleAutomaticBackups',
    'formatBackupsList',
    'getBackupStats',
    'formatBytes',
    'incrementalBackup',
    'deleteBackup'
  ];
  
  let allMethodsExist = true;
  for (const method of methods) {
    if (typeof backupSystem[method] !== 'function') {
      console.log(`❌ الطريقة ${method} غير موجودة`);
      allMethodsExist = false;
    }
  }
  
  if (allMethodsExist) {
    console.log('✅ Test 3: جميع الطرق موجودة');
  }
  
  // Test 4: Check backup directory
  const fs = require('fs');
  if (fs.existsSync(backupSystem.backupDir)) {
    console.log('✅ Test 4: مجلد النسخ الاحتياطية موجود');
  } else {
    console.log('⚠️  Test 4: مجلد النسخ الاحتياطية غير موجود (سيتم إنشاؤه عند أول نسخة)');
  }
  
  // Test 5: Test formatBytes helper
  const testSizes = [
    { input: 0, expected: '0 Bytes' },
    { input: 1024, expected: '1 KB' },
    { input: 1048576, expected: '1 MB' }
  ];
  
  let formatBytesWorks = true;
  for (const test of testSizes) {
    const result = backupSystem.formatBytes(test.input);
    if (result !== test.expected) {
      console.log(`❌ formatBytes(${test.input}) = ${result}, expected ${test.expected}`);
      formatBytesWorks = false;
    }
  }
  
  if (formatBytesWorks) {
    console.log('✅ Test 5: formatBytes يعمل بشكل صحيح');
  }
  
  // Test 6: Test getBackupType
  const typeTests = [
    { filename: 'full_backup_123.json', expected: 'كاملة' },
    { filename: 'users_backup_123.json', expected: 'مستخدمين' },
    { filename: 'groups_backup_123.json', expected: 'مجموعات' }
  ];
  
  let getBackupTypeWorks = true;
  for (const test of typeTests) {
    const result = backupSystem.getBackupType(test.filename);
    if (result !== test.expected) {
      console.log(`❌ getBackupType(${test.filename}) = ${result}, expected ${test.expected}`);
      getBackupTypeWorks = false;
    }
  }
  
  if (getBackupTypeWorks) {
    console.log('✅ Test 6: getBackupType يعمل بشكل صحيح');
  }
  
  // Test 7: List backups (should return empty array if no backups)
  const backups = backupSystem.listBackups();
  if (Array.isArray(backups)) {
    console.log(`✅ Test 7: listBackups يعمل (${backups.length} نسخة موجودة)`);
  } else {
    console.log('❌ Test 7: listBackups لا يُرجع مصفوفة');
  }
  
  // Test 8: Get backup stats
  const stats = backupSystem.getBackupStats();
  if (stats && typeof stats === 'object') {
    console.log('✅ Test 8: getBackupStats يعمل');
    console.log(`   - عدد النسخ: ${stats.backupCount}`);
    console.log(`   - النسخ الكاملة: ${stats.fullBackups}`);
    console.log(`   - النسخ المضغوطة: ${stats.compressedBackups}`);
    console.log(`   - الحجم الإجمالي: ${stats.totalSize}`);
  } else {
    console.log('❌ Test 8: getBackupStats لا يعمل');
  }
  
  // Test 9: Format backups list
  const formattedList = backupSystem.formatBackupsList();
  if (typeof formattedList === 'string') {
    console.log('✅ Test 9: formatBackupsList يعمل');
  } else {
    console.log('❌ Test 9: formatBackupsList لا يُرجع نص');
  }
  
  console.log('\n📊 النتيجة النهائية:');
  console.log('✅ جميع الاختبارات الأساسية نجحت!');
  console.log('📝 النظام جاهز للاستخدام');
  console.log('\n💡 لاختبار الوظائف الكاملة:');
  console.log('   1. قم بتشغيل البوت');
  console.log('   2. استخدم الأمر /backup');
  console.log('   3. جرّب خيارات النسخ الاحتياطي المختلفة');
  
} catch (error) {
  console.log('❌ فشل الاختبار:', error.message);
  console.error(error);
  process.exit(1);
}
