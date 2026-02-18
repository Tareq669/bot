/**
 * نموذج الردود الذكية
 * Smart Replies Model
 *
 * يتيح للأدمنز إضافة كلمات مفتاحية والردود المقابلة لها
 */
const mongoose = require('mongoose');

const smartReplySchema = new mongoose.Schema({
  // معرف المجموعة
  groupId: {
    type: Number,
    required: true,
    index: true
  },

  // عنوان المجموعة
  groupTitle: {
    type: String,
    default: ''
  },

  // حالة التفعيل
  enabled: {
    type: Boolean,
    default: true
  },

  // قائمة الردود
  replies: [{
    // معرف الرد الفريد
    replyId: {
      type: String,
      required: true
    },

    // الكلمات المفتاحية (يمكن إضافة عدة كلمات لنفس الرد)
    keywords: [{
      type: String,
      required: true
    }],

    // نص الرد
    replyText: {
      type: String,
      required: true
    },

    // المستخدم الذي أضاف الرد
    addedBy: {
      type: Number,
      default: null
    },

    // اسم المستخدم الذي أضاف الرد
    addedByName: {
      type: String,
      default: ''
    },

    // تاريخ الإضافة
    addedAt: {
      type: Date,
      default: Date.now
    },

    // عدد مرات الاستخدام
    useCount: {
      type: Number,
      default: 0
    }
  }],

  // إحصائيات الاستخدام
  stats: {
    totalReplies: { type: Number, default: 0 },
    totalTriggers: { type: Number, default: 0 }
  },

  // وقت الإنشاء والتحديث
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// إنشاء فهرس للبحث بالكلمات المفتاحية
smartReplySchema.index({ groupId: 1, 'replies.keywords': 1 });

// دالة مساعدة لتوليد معرف فريد
smartReplySchema.statics.generateReplyId = function() {
  return `reply_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`;
};

// دالة للبحث عن رد بكلمة مفتاحية
smartReplySchema.methods.findReplyByKeyword = function(keyword) {
  const normalizedKeyword = keyword.toLowerCase().trim();
  return this.replies.find(function(reply) {
    return reply.keywords.some(function(k) {
      return k.toLowerCase() === normalizedKeyword;
    });
  });
};

module.exports = mongoose.model('SmartReply', smartReplySchema);
