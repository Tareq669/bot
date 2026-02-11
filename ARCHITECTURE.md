# 🏗️ معمارية النظام - Arab Telegram Bot

## نظرة عامة

هذا المستند يشرح البنية المعمارية الشاملة لبوت تيليجرام، والمبادئ التصميمية المتبعة، وكيفية تنظيم الكود.

## 📊 البنية العامة

```
┌─────────────────────────────────────────┐
│         Telegram Bot API                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      src/index.js (Entry Point)         │
│  - Bot Initialization                   │
│  - Middleware Setup                     │
│  - Error Handling                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│          Handlers Layer                 │
│  ┌────────────────────────────────┐    │
│  │  adminHandlers.js              │    │
│  │  aiHandlers.js                 │    │
│  │  gameHandlers.js               │    │
│  │  economyHandlers.js            │    │
│  │  contentHandlers.js            │    │
│  │  moderationHandlers.js         │    │
│  └────────────────────────────────┘    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│        Business Logic Layer             │
│  ┌────────────────────────────────┐    │
│  │  Commands (commandHandler.js)  │    │
│  │  Games (gameManager.js)        │    │
│  │  Economy (economyManager.js)   │    │
│  │  Content (contentProvider.js)  │    │
│  │  AI (integratedAI.js)          │    │
│  └────────────────────────────────┘    │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│          Data Layer                     │
│  ┌────────────────────────────────┐    │
│  │  Database Models               │    │
│  │  - User                        │    │
│  │  - Group                       │    │
│  │  - Transaction                 │    │
│  │  - GameStats                   │    │
│  └────────────────────────────────┘    │
│              MongoDB                    │
└─────────────────────────────────────────┘

         ┌──────────────┐
         │  Utils Layer │
         │  - Logger    │
         │  - Cache     │
         │  - Helpers   │
         └──────────────┘
```

## 🎯 المبادئ التصميمية

### 1. Separation of Concerns (فصل المسؤوليات)
كل طبقة لها مسؤولية محددة:
- **Handlers**: استقبال الطلبات وتوجيهها
- **Business Logic**: تطبيق قواعد العمل
- **Data Layer**: التعامل مع قاعدة البيانات
- **Utils**: أدوات مساعدة عامة

### 2. Single Responsibility Principle
كل ملف/كلاس له مسؤولية واحدة واضحة:
- `adminHandlers.js` - فقط معالجات الإدارة
- `gameHandlers.js` - فقط معالجات الألعاب
- `logger.js` - فقط عمليات التسجيل

### 3. DRY (Don't Repeat Yourself)
- الثوابت مركزية في `constants.js`
- الوظائف المشتركة في `utils/helpers.js`
- معالجة الأخطاء موحدة

### 4. Error Handling
معالجة شاملة للأخطاء في جميع الطبقات:
```javascript
try {
  // Code logic
} catch (error) {
  logger.error('Operation failed', error);
  ctx.reply(ERROR_MESSAGES.GENERIC);
}
```

## 📂 تنظيم المجلدات

### `/src/handlers/`
معالجات الأحداث المنظمة حسب الوظيفة:

```javascript
// adminHandlers.js
class AdminHandlers {
  static register(bot) {
    bot.command('health', AdminHandlers.handleHealthCommand);
    // ...
  }
}
```

**الميزات:**
- تسجيل مركزي للمعالجات
- معالجة أخطاء شاملة
- Logging تلقائي للتفاعلات

### `/src/commands/`
منطق الأوامر الأساسي:
- `commandHandler.js` - أوامر عامة
- `menuHandler.js` - القوائم التفاعلية
- `gameHandler.js` - منطق الألعاب
- `economyHandler.js` - المعاملات الاقتصادية

### `/src/database/`
نماذج قاعدة البيانات:
```javascript
// models/User.js
const userSchema = new mongoose.Schema({
  userId: Number,
  firstName: String,
  coins: { type: Number, default: 1000 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
});
```

### `/src/utils/`
الأدوات المساعدة:
- `logger.js` - نظام Logging متقدم
- `cacheManager.js` - إدارة التخزين المؤقت
- `helpers.js` - وظائف مساعدة
- `reconnect.js` - إدارة إعادة الاتصال

### `/src/config/`
الإعدادات والثوابت:
```javascript
// constants.js
module.exports = {
  ECONOMY: {
    STARTING_BALANCE: 1000,
    DAILY_REWARD: { MIN: 100, MAX: 500 }
  },
  ERROR_MESSAGES: {
    GENERIC: '❌ حدث خطأ غير متوقع'
  }
};
```

## 🔄 تدفق البيانات

### مثال: معالجة أمر /balance

```
1. User sends /balance
        ↓
2. Telegraf captures command
        ↓
3. economyHandlers.handleBalance() called
        ↓
4. EconomyHandler.handleBalance(ctx) executes
        ↓
5. Query User model from database
        ↓
6. Format response with UIManager
        ↓
7. Send reply to user
        ↓
8. Log interaction with logger
```

## 🔐 نظام Logging

### الهيكل
```javascript
logger.info('Message', data);     // معلومات عامة
logger.warn('Warning', data);     // تحذيرات
logger.error('Error', error);     // أخطاء
logger.success('Success', data);  // نجاح

// Specialized logging
logger.logCommand('start', userId, success);
logger.logInteraction(userId, action, details);
logger.logApiCall(api, method, success, duration);
logger.logDatabase(operation, model, success, error);
```

### حفظ السجلات
- ملف منفصل لكل يوم: `logs/bot-YYYY-MM-DD.log`
- تنظيف تلقائي (الاحتفاظ بـ 7 أيام)
- تنسيق موحد مع timestamp

## 🗄️ نظام قاعدة البيانات

### النماذج الرئيسية

#### User Model
```javascript
{
  userId: Number,           // Telegram User ID
  firstName: String,        // اسم المستخدم
  coins: Number,           // العملات
  xp: Number,              // نقاط الخبرة
  level: Number,           // المستوى
  lastDaily: Date,         // آخر مكافأة يومية
  inventory: Array,        // المخزون
  settings: Object,        // الإعدادات
  stats: Object            // الإحصائيات
}
```

#### Group Model
```javascript
{
  groupId: Number,         // Telegram Group ID
  name: String,           // اسم المجموعة
  settings: Object,       // إعدادات المجموعة
  protection: Object,     // إعدادات الحماية
  moderators: Array       // قائمة المشرفين
}
```

### استعلامات محسّنة
```javascript
// استخدام indexes
userSchema.index({ userId: 1 });
userSchema.index({ coins: -1 });

// استعلامات مع caching
const cachedUser = await cache.get(`user:${userId}`);
if (!cachedUser) {
  const user = await User.findOne({ userId });
  await cache.set(`user:${userId}`, user);
}
```

## 🎮 نظام الألعاب

### البنية
```
GameHandlers (handlers/gameHandlers.js)
    ↓
GameHandler (commands/gameHandler.js)
    ↓
GameManager (games/gameManager.js)
    ↓
Individual Games (quranicGames.js, etc.)
```

### مثال: لعبة RPS
```javascript
1. User clicks "game:rps" button
2. GameHandlers.handleRPS() called
3. GameHandler.handleRPS(ctx) creates game
4. Show game options to user
5. User selects choice
6. Calculate result
7. Update user stats (coins, xp)
8. Log game result
```

## 💰 النظام الاقتصادي

### مكونات النظام
- **Coins**: العملة الأساسية
- **Daily Rewards**: مكافآت يومية
- **Shop**: متجر للمشتريات
- **Transfers**: تحويلات بين المستخدمين
- **Transactions**: سجل المعاملات

### معالجة المعاملات
```javascript
// Atomic transaction
const session = await mongoose.startSession();
session.startTransaction();
try {
  // Deduct from sender
  await User.updateOne(
    { userId: senderId },
    { $inc: { coins: -amount } },
    { session }
  );
  
  // Add to receiver
  await User.updateOne(
    { userId: receiverId },
    { $inc: { coins: amount } },
    { session }
  );
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
}
```

## 🧪 نظام الاختبار

### أنواع الاختبارات

#### Unit Tests
```javascript
// test/unit/logger.test.js
describe('Logger', () => {
  it('should format message correctly', () => {
    const message = logger.formatMessage('INFO', 'Test');
    expect(message).toContain('[INFO]');
  });
});
```

#### Integration Tests
```javascript
// test/integration/economy.test.js
describe('Economy System', () => {
  it('should transfer coins between users', async () => {
    // Test full transfer flow
  });
});
```

### Coverage
- Target: 50%+ code coverage
- Focus on critical paths
- Mock external dependencies

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
1. Checkout code
2. Setup Node.js
3. Install dependencies (npm ci)
4. Run linter (ESLint)
5. Run tests (Jest)
6. Generate coverage report
7. Upload to Codecov
```

## 🚀 Performance Optimizations

### 1. Caching
```javascript
// Cache frequently accessed data
const cacheManager = require('./utils/cacheManager');
await cacheManager.set(key, data, ttl);
const cached = await cacheManager.get(key);
```

### 2. Database Indexing
```javascript
userSchema.index({ userId: 1 });
userSchema.index({ coins: -1 });
```

### 3. Connection Pooling
```javascript
mongoose.connect(uri, {
  maxPoolSize: 10,
  minPoolSize: 5
});
```

## 🔒 الأمان

### 1. Permission Checks
```javascript
if (!AdminHandlers.isOwner(ctx.from.id)) {
  return ctx.reply(ERROR_MESSAGES.NO_PERMISSION);
}
```

### 2. Input Validation
```javascript
if (!PATTERNS.NUMBER.test(amount)) {
  return ctx.reply(ERROR_MESSAGES.INVALID_INPUT);
}
```

### 3. Rate Limiting
```javascript
const rateLimiter = require('./utils/rateLimiter');
if (rateLimiter.isLimited(userId)) {
  return ctx.reply(ERROR_MESSAGES.COOLDOWN);
}
```

## 📈 Monitoring & Logging

### Health Monitoring
```javascript
// healthMonitor.js
- Track uptime
- Monitor errors
- Database connection status
- Memory usage
```

### Performance Metrics
- Response time tracking
- Database query performance
- API call monitoring
- Error rate tracking

## 🔮 خطط مستقبلية

### تحسينات مقترحة
1. ✅ Redis for caching
2. ✅ WebSocket support
3. ✅ Microservices architecture
4. ✅ GraphQL API
5. ✅ Advanced analytics dashboard

---

هذه البنية المعمارية مصممة لتكون:
- 📦 **Modular** - سهلة التوسع والصيانة
- 🔒 **Secure** - محمية ضد الثغرات الشائعة
- ⚡ **Performant** - محسّنة للأداء
- 🧪 **Testable** - قابلة للاختبار بسهولة
- 📚 **Documented** - موثقة بشكل كامل
