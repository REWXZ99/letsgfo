const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const initializeDatabase = async () => {
  try {
    // Cek koneksi database
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database connection is healthy');
    
    // Seed admin awal
    await Admin.seedInitialAdmins();
    
    // Create indexes
    await mongoose.connection.db.collection('projects').createIndex({ name: 'text', language: 'text', tags: 'text' });
    await mongoose.connection.db.collection('projects').createIndex({ createdAt: -1 });
    await mongoose.connection.db.collection('projects').createIndex({ likes: -1 });
    await mongoose.connection.db.collection('admins').createIndex({ username: 1 }, { unique: true });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

module.exports = { initializeDatabase };
