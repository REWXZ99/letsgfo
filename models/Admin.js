const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Owner'],
    required: true,
    default: 'Admin'
  },
  quote: {
    type: String,
    trim: true,
    default: ''
  },
  hashtags: [{
    type: String,
    trim: true
  }],
  photoUrl: {
    type: String,
    default: 'https://res.cloudinary.com/dnb0q2s2h/image/upload/v1700000000/default-avatar.png'
  },
  password: {
    type: String,
    required: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
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

// Hash password sebelum menyimpan
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method untuk memverifikasi password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method untuk update status online
adminSchema.methods.setOnline = function() {
  this.isOnline = true;
  this.lastActive = Date.now();
  return this.save();
};

// Method untuk update status offline
adminSchema.methods.setOffline = function() {
  this.isOnline = false;
  return this.save();
};

// Static method untuk mendapatkan admin berdasarkan username
adminSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() }).exec();
};

// Static method untuk mendapatkan semua legends
adminSchema.statics.getLegends = function() {
  return this.find({ role: { $in: ['Admin', 'Owner'] } })
    .select('-password -__v')
    .sort({ role: -1, name: 1 })
    .exec();
};

// Static method untuk seed data admin awal
adminSchema.statics.seedInitialAdmins = async function() {
  const initialAdmins = [
    {
      username: 'silverhold',
      name: 'SilverHold Official',
      role: 'Admin',
      quote: 'Jangan lupa sholat walaupun kamu seorang pendosa, Allah lebih suka orang pendosa yang sering bertaubat daripada orang yang merasa suci',
      hashtags: ['#bismillahcalonustad'],
      password: 'Rian'
    },
    {
      username: 'braynofficial',
      name: 'Brayn Official',
      role: 'Owner',
      quote: 'Tidak Semua Orang Suka Kita Berkembang Pesat!',
      hashtags: ['#backenddev', '#frontenddev', '#BraynOfficial'],
      password: 'Plerr321'
    }
  ];

  try {
    for (const adminData of initialAdmins) {
      const existingAdmin = await this.findByUsername(adminData.username);
      if (!existingAdmin) {
        await this.create(adminData);
        console.log(`✅ Admin ${adminData.name} created`);
      }
    }
    console.log('✅ Initial admin seeding completed');
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
  }
};

const Admin = mongoose.model('Admin', adminSchema);

module.exports = Admin;
