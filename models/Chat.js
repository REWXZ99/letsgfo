const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'admin'],
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    _id: false
  }],
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
    index: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Plugin pagination
chatSchema.plugin(mongoosePaginate);

// Pre-save hook to update lastMessageAt
chatSchema.pre('save', function(next) {
  if (this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
  }
  this.updatedAt = Date.now();
  next();
});

// Index for sorting
chatSchema.index({ lastMessageAt: -1 });
chatSchema.index({ adminId: 1, status: 1 });

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;
