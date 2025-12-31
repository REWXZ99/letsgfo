const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['CODE', 'FILE'],
    required: true,
    default: 'CODE'
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'CODE';
    }
  },
  fileUrl: {
    type: String,
    required: function() {
      return this.type === 'FILE';
    }
  },
  notes: {
    type: String,
    trim: true
  },
  previewUrl: {
    type: String,
    trim: true
  },
  likes: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  isFeatured: {
    type: Boolean,
    default: false
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

// Index untuk pencarian cepat
projectSchema.index({ name: 'text', language: 'text', tags: 'text' });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ likes: -1 });
projectSchema.index({ downloads: -1 });

// Pre-save hook untuk update updatedAt
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method untuk mencari proyek populer
projectSchema.statics.findPopular = function(limit = 10) {
  return this.find()
    .sort({ likes: -1, downloads: -1 })
    .limit(limit)
    .populate('authorId', 'name photoUrl role')
    .exec();
};

// Static method untuk mencari proyek terbaru
projectSchema.statics.findLatest = function(limit = 20) {
  return this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('authorId', 'name photoUrl role')
    .exec();
};

// Method untuk increment likes
projectSchema.methods.incrementLikes = function() {
  this.likes += 1;
  return this.save();
};

// Method untuk increment downloads
projectSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
