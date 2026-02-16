/**
 * Backup System Test
 * اختبار نظام النسخ الاحتياطي
 */

const fs = require('fs');
const path = require('path');

// Mock the database models and helpers
jest.mock('../src/database/models', () => ({
  User: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  Group: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  Transaction: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  GameStats: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  Content: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  Config: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  Team: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  Event: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  Auction: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  }
}));

jest.mock('../src/utils/helpers', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    success: jest.fn()
  }
}));

const BackupSystem = require('../src/utils/backupSystem');
const { User, Group, Transaction } = require('../src/database/models');

describe('Backup System Tests', () => {
  let backupSystem;
  let testBackupDir;

  beforeEach(() => {
    // Create test backup directory
    testBackupDir = path.join(__dirname, '../test-backups');
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testBackupDir, { recursive: true });

    backupSystem = new BackupSystem();
    backupSystem.backupDir = testBackupDir;

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
  });

  describe('Backup Directory Management', () => {
    test('should ensure backup directory exists', () => {
      expect(fs.existsSync(testBackupDir)).toBe(true);
    });
  });

  describe('Users Backup', () => {
    test('should backup users successfully', async () => {
      const mockUsers = [
        { userId: 1, username: 'user1', coins: 100 },
        { userId: 2, username: 'user2', coins: 200 }
      ];

      User.find.mockReturnValue({
        lean: () => Promise.resolve(mockUsers)
      });

      const result = await backupSystem.backupUsers();

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(result.filename).toContain('users_backup');
      expect(fs.existsSync(path.join(testBackupDir, result.filename))).toBe(true);
    });

    test('should handle backup errors gracefully', async () => {
      User.find.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await backupSystem.backupUsers();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Full Backup', () => {
    test('should create full backup with all collections', async () => {
      const mockData = {
        lean: () => Promise.resolve([{ id: 1 }])
      };

      User.find.mockReturnValue(mockData);
      Group.find.mockReturnValue(mockData);
      Transaction.find.mockReturnValue(mockData);

      const result = await backupSystem.fullBackup(false);

      expect(result.success).toBe(true);
      expect(result.filename).toContain('full_backup');
      expect(result.statistics).toBeDefined();
      expect(fs.existsSync(path.join(testBackupDir, result.filename))).toBe(true);
    });

    test('should create compressed backup', async () => {
      const mockData = {
        lean: () => Promise.resolve([{ id: 1 }])
      };

      User.find.mockReturnValue(mockData);
      Group.find.mockReturnValue(mockData);
      Transaction.find.mockReturnValue(mockData);

      const result = await backupSystem.fullBackup(true);

      expect(result.success).toBe(true);
      expect(result.compressed).toBe(true);
      expect(result.filename).toContain('.gz');
    });
  });

  describe('Backup List', () => {
    test('should list all backup files', async () => {
      // Create test backup files
      const testFile1 = path.join(testBackupDir, 'full_backup_123.json');
      const testFile2 = path.join(testBackupDir, 'users_backup_456.json');
      fs.writeFileSync(testFile1, JSON.stringify({ test: 'data' }));
      fs.writeFileSync(testFile2, JSON.stringify({ test: 'data' }));

      const backups = backupSystem.listBackups();

      expect(backups.length).toBe(2);
      expect(backups[0]).toHaveProperty('filename');
      expect(backups[0]).toHaveProperty('size');
      expect(backups[0]).toHaveProperty('date');
      expect(backups[0]).toHaveProperty('type');
    });

    test('should return empty array when no backups exist', () => {
      const backups = backupSystem.listBackups();
      expect(backups).toEqual([]);
    });
  });

  describe('Backup Statistics', () => {
    test('should calculate backup statistics correctly', () => {
      // Create test backup files
      const testFile = path.join(testBackupDir, 'full_backup_123.json.gz');
      fs.writeFileSync(testFile, JSON.stringify({ test: 'data' }));

      const stats = backupSystem.getBackupStats();

      expect(stats).toHaveProperty('backupCount');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('fullBackups');
      expect(stats).toHaveProperty('compressedBackups');
    });
  });

  describe('Backup Type Detection', () => {
    test('should detect full backup type', () => {
      const type = backupSystem.getBackupType('full_backup_123.json');
      expect(type).toBe('كاملة');
    });

    test('should detect users backup type', () => {
      const type = backupSystem.getBackupType('users_backup_123.json');
      expect(type).toBe('مستخدمين');
    });

    test('should detect groups backup type', () => {
      const type = backupSystem.getBackupType('groups_backup_123.json');
      expect(type).toBe('مجموعات');
    });
  });

  describe('Backup Restoration', () => {
    test('should preview backup without restoring', async () => {
      const backupData = {
        version: '2.0',
        metadata: { botVersion: '1.0.0' },
        statistics: { totalUsers: 10 }
      };

      const testFile = path.join(testBackupDir, 'test_backup.json');
      fs.writeFileSync(testFile, JSON.stringify(backupData));

      const result = await backupSystem.restoreFromBackup('test_backup.json', { 
        dryRun: true 
      });

      expect(result.success).toBe(true);
      expect(result.preview).toBe(true);
      expect(result.metadata).toBeDefined();
    });

    test('should fail when backup file does not exist', async () => {
      const result = await backupSystem.restoreFromBackup('nonexistent.json');
      expect(result.success).toBe(false);
      expect(result.error).toBe('الملف غير موجود');
    });
  });

  describe('Old Backup Cleanup', () => {
    test('should delete backups older than specified days', () => {
      // Create old backup file
      const oldFile = path.join(testBackupDir, 'old_backup.json');
      fs.writeFileSync(oldFile, JSON.stringify({ test: 'data' }));

      // Change file modification time to 40 days ago
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      fs.utimesSync(oldFile, oldDate, oldDate);

      const result = backupSystem.deleteOldBackups(30);

      expect(result.success).toBe(true);
      expect(result.deleted).toBeGreaterThan(0);
      expect(fs.existsSync(oldFile)).toBe(false);
    });

    test('should not delete recent backups', () => {
      const recentFile = path.join(testBackupDir, 'recent_backup.json');
      fs.writeFileSync(recentFile, JSON.stringify({ test: 'data' }));

      const result = backupSystem.deleteOldBackups(30);

      expect(result.success).toBe(true);
      expect(result.deleted).toBe(0);
      expect(fs.existsSync(recentFile)).toBe(true);
    });
  });

  describe('Format Helpers', () => {
    test('should format bytes correctly', () => {
      expect(backupSystem.formatBytes(0)).toBe('0 Bytes');
      expect(backupSystem.formatBytes(1024)).toBe('1 KB');
      expect(backupSystem.formatBytes(1048576)).toBe('1 MB');
      expect(backupSystem.formatBytes(1073741824)).toBe('1 GB');
    });

    test('should format backup list for display', () => {
      const testFile = path.join(testBackupDir, 'full_backup_123.json');
      fs.writeFileSync(testFile, JSON.stringify({ test: 'data' }));

      const formatted = backupSystem.formatBackupsList();

      expect(formatted).toContain('النسخ الاحتياطية المتاحة');
      expect(formatted).toContain('full_backup_123.json');
    });

    test('should show empty message when no backups', () => {
      const formatted = backupSystem.formatBackupsList();
      expect(formatted).toBe('📭 لا توجد نسخ احتياطية حتى الآن');
    });
  });
});

console.log('✅ Backup System Tests Ready');
