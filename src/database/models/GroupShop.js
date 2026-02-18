const mongoose = require('mongoose');

/**
 * نموذج متجر المجموعة
 * يخزن عناصر المتجر الخاصة بكل مجموعة
 */
const groupShopSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
    index: true
  },
  // معرف فريد للعنصر
  itemId: {
    type: String,
    required: true
  },
  // اسم العنصر
  name: {
    type: String,
    required: true,
    trim: true
  },
  // وصف العنصر
  description: {
    type: String,
    default: ''
  },
  // نوع العنصر
  // 'title' - لقب مخصص
  // 'permission' - صلاحية مؤقتة
  // 'sticker' - ملصق
  // 'badge' - شارة
  // 'custom' - مخصص
  type: {
    type: String,
    enum: ['title', 'permission', 'sticker', 'badge', 'custom'],
    default: 'custom'
  },
  // سعر العنصر
  price: {
    type: Number,
    required: true,
    min: 1
  },
  // هل العنصر متاح للشراء
  available: {
    type: Boolean,
    default: true
  },
  // إذا كانت type هي 'permission' - مدة الصلاحية بالساعات
  duration: {
    type: Number,
    default: null
  },
  // إذا كانت type هي 'permission' - نوع الصلاحية
  permissionType: {
    type: String,
    default: null,
    enum: ['can_send_messages', 'can_use_commands', 'can_send_media', 'can_add_members', null]
  },
  // الشارة أو الأيقونة
  icon: {
    type: String,
    default: '📦'
  },
  // من إضافة هذا العنصر
  addedBy: {
    type: Number,
    default: null
  },
  // عدد مرات الشراء
  purchaseCount: {
    type: Number,
    default: 0
  },
  // قيود الشراء (عدد مرات الشراء المسموح بها)
  maxPurchases: {
    type: Number,
    default: null // null يعني غير محدود
  }
}, { timestamps: true });

// Compound index
groupShopSchema.index({ groupId: 1, itemId: 1 }, { unique: true });
groupShopSchema.index({ groupId: 1, available: 1 });

module.exports = mongoose.models.GroupShop || mongoose.model('GroupShop', groupShopSchema);
