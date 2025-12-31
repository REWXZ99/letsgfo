
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();

// Konfigurasi Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: 'dnb0q2s2h',
  api_key: '838368993294916',
  api_secret: 'N9U1eFJGKjJ-A8Eo4BTtSCl720c'
});

// Koneksi MongoDB BARU
const MONGODB_URI = 'mongodb+srv://dafanation1313_db_user:Xr6m2tyjgiAlM8x5@cluster0.00ilnna.mongodb.net/source_code_hub?retryWrites=true&w=majority';

// Connect to MongoDB dengan timeout lebih lama untuk Vercel
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000, // 10 seconds
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database:', mongoose.connection.name || 'source_code_hub');
  console.log('🔗 Connection state:', mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected');
  
  // Initialize database
  initializeDatabase();
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  console.error('🔧 Error details:', err);
});

// Function to initialize database
const initializeDatabase = async () => {
  try {
    const Admin = require('./models/Admin');
    
    // Seed initial admins
    await Admin.seedInitialAdmins();
    console.log('✅ Admin seeding completed');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
};

// Middleware Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "wss://*.vercel.app", "https://*.vercel.app"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Session Configuration
app.use(session({
  secret: 'source-code-hub-cyberpunk-secret-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    ttl: 24 * 60 * 60,
    mongoOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: true
}));

// Global variables for EJS
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.admin = req.session.admin || null;
  res.locals.csrfToken = req.session.csrfToken || '';
  next();
});

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log('🔌 New user connected:', socket.id);
  
  socket.on('join-chat', (userId) => {
    socket.join(userId);
    console.log(`💬 User ${userId} joined chat room`);
  });
  
  socket.on('send-message', (data) => {
    console.log(`📨 Message from ${data.sender} to room ${data.room}`);
    io.to(data.room).emit('receive-message', data);
  });
  
  socket.on('like-project', (projectId) => {
    console.log(`❤️ Project ${projectId} liked`);
    io.emit('project-liked', { projectId, timestamp: new Date() });
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
  
  socket.on('error', (error) => {
    console.error('❌ Socket.IO error:', error);
  });
});

// Attach io to app for use in routes
app.set('io', io);
app.set('socketio', io);

// Basic Routes
app.get('/', (req, res) => {
  res.render('pages/home', {
    title: 'Source Code Hub - Futuristic Code Sharing Platform',
    headContent: ''
  });
});

app.get('/project/:id', (req, res) => {
  res.render('pages/project-detail', { 
    projectId: req.params.id,
    title: 'Project Details',
    headContent: ''
  });
});

app.get('/legends', (req, res) => {
  res.render('pages/legends', {
    title: 'Legends - Source Code Hub',
    headContent: ''
  });
});

// Admin Routes (Pages)
app.get('/admin/login', (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.render('pages/admin/login', {
    title: 'Admin Login - Source Code Hub',
    headContent: ''
  });
});

app.get('/admin/dashboard', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/admin/login');
  }
  res.render('pages/admin/dashboard', {
    title: 'Admin Dashboard - Source Code Hub',
    headContent: ''
  });
});

app.get('/admin/projects/upload', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/admin/login');
  }
  res.render('pages/admin/project-upload', {
    title: 'Upload Project - Admin Dashboard',
    headContent: ''
  });
});

app.get('/admin/profile', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/admin/login');
  }
  res.render('pages/admin/profile', {
    title: 'Edit Profile - Admin Dashboard',
    headContent: ''
  });
});

// API Routes
try {
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
  console.log('✅ API Routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load API routes:', error);
  // Fallback basic API routes
  app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({ 
      status: 'OK',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  app.get('/api/db-status', (req, res) => {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({
      connectionState: states[mongoose.connection.readyState],
      readyState: mongoose.connection.readyState,
      name: mongoose.connection.name || 'source_code_hub'
    });
  });
}

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'images', 'favicon.ico'));
});

// Error handling - 404
app.use((req, res, next) => {
  res.status(404).render('pages/404', {
    title: '404 - Page Not Found',
    headContent: ''
  });
});

// Error handling - 500
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  console.error('📋 Error stack:', err.stack);
  
  res.status(500).render('pages/500', { 
    title: '500 - Server Error',
    headContent: '',
    error: process.env.NODE_ENV === 'development' ? err : null,
    env: process.env.NODE_ENV || 'production'
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export untuk Vercel (Serverless Function)
// Vercel expects a function export for serverless functions
const vercelHandler = (req, res) => {
  // Attach io to request for use in routes
  req.io = io;
  return app(req, res);
};

// For Vercel serverless functions
module.exports = vercelHandler;

// Start server untuk development (local only)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  
  // Additional check for MongoDB connection
  const checkDatabase = setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Database connection verified');
      clearInterval(checkDatabase);
    }
  }, 1000);
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`🚀 Source Code Hub Server Started`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`🌐 Network: http://${require('ip').address()}:${PORT}`);
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
    console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('='.repeat(50));
    
    // Log available routes
    console.log('\n📡 Available Routes:');
    console.log('  GET  /                    - Home page');
    console.log('  GET  /legends             - Legends page');
    console.log('  GET  /project/:id         - Project detail');
    console.log('  GET  /admin/login         - Admin login');
    console.log('  GET  /admin/dashboard     - Admin dashboard');
    console.log('  GET  /api/health          - Health check');
    console.log('  GET  /api/db-status       - Database status');
    console.log('\n🔧 Socket.IO: ws://localhost:3000');
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('💤 HTTP server closed');
      mongoose.connection.close(false, () => {
        console.log('💤 MongoDB connection closed');
        process.exit(0);
      });
    });
  });
}
