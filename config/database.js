
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const MONGODB_URI = 'mongodb+srv://dafanation1313_db_user:Xr6m2tyjgiAlM8x5@cluster0.00ilnna.mongodb.net/source_code_hub?retryWrites=true&w=majority';

const initializeDatabase = async () => {
  try {
    // Cek koneksi database
    await mongoose.connection.db.admin().ping();
    console.log('✅ Database connection is healthy');
    
    // Create database if not exists
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections in database: ${collections.map(c => c.name).join(', ')}`);
    
    // Seed admin awal jika belum ada
    await Admin.seedInitialAdmins();
    
    // Create indexes untuk performance
    await mongoose.connection.db.collection('projects').createIndex({ name: 'text', language: 'text', tags: 'text' });
    await mongoose.connection.db.collection('projects').createIndex({ createdAt: -1 });
    await mongoose.connection.db.collection('projects').createIndex({ likes: -1 });
    await mongoose.connection.db.collection('admins').createIndex({ username: 1 }, { unique: true });
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    
    // Jika error karena collection tidak ada, buat collection kosong
    if (error.code === 26 || error.message.includes('ns not found')) {
      console.log('⚠️ Creating initial collections...');
      
      // Create collections dengan schema validation
      const db = mongoose.connection.db;
      
      // Create projects collection
      await db.createCollection('projects', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["name", "language", "type", "authorId"],
            properties: {
              name: { bsonType: "string" },
              language: { bsonType: "string" },
              type: { enum: ["CODE", "FILE"] },
              authorId: { bsonType: "objectId" }
            }
          }
        }
      });
      
      // Create admins collection
      await db.createCollection('admins', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: ["username", "name", "role", "password"],
            properties: {
              username: { bsonType: "string" },
              name: { bsonType: "string" },
              role: { enum: ["Admin", "Owner"] },
              password: { bsonType: "string" }
            }
          }
        }
      });
      
      // Create chats collection
      await db.createCollection('chats');
      
      console.log('✅ Initial collections created');
      
      // Seed admins lagi setelah collection dibuat
      await Admin.seedInitialAdmins();
    }
  }
};

// Event listeners untuk MongoDB
mongoose.connection.on('connected', () => {
  console.log('🔗 MongoDB connected successfully');
  initializeDatabase();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

module.exports = { 
  MONGODB_URI,
  initializeDatabase 
};
