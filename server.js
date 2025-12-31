
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

// Koneksi MongoDB
const MONGODB_URI = 'mongodb+srv://dafanation1313_db_user:Xr6m2tyjgiAlM8x5@cluster0.00ilnna.mongodb.net/source_code_hub?retryWrites=true&w=majority';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✅ MongoDB Connected Successfully!');
  console.log('📊 Database:', mongoose.connection.name || 'source_code_hub');
  
  // Initialize database
  initializeDatabase();
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
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

// Middleware untuk set default template variables
app.use((req, res, next) => {
  // Set default values untuk EJS
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.admin = req.session.admin || null;
  res.locals.csrfToken = req.session.csrfToken || '';
  res.locals.messages = req.session.messages || null;
  
  // Clear messages setelah dipakai
  if (req.session.messages) {
    delete req.session.messages;
  }
  
  next();
});

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

// Serve static files
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: true
}));

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
  });
  
  socket.on('send-message', (data) => {
    io.to(data.room).emit('receive-message', data);
  });
  
  socket.on('like-project', (projectId) => {
    io.emit('project-liked', { projectId, timestamp: new Date() });
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Attach io to app
app.set('io', io);

// ==================== BASIC ROUTES ====================

// Home page with error handling
app.get('/', (req, res) => {
  try {
    res.render('pages/home', {
      title: 'Source Code Hub - Futuristic Code Sharing Platform',
      body: '' // Add body variable
    });
  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).render('pages/500', {
      title: '500 - Server Error',
      error: error,
      env: process.env.NODE_ENV || 'production',
      body: ''
    });
  }
});

// Project detail page
app.get('/project/:id', (req, res) => {
  try {
    res.render('pages/project-detail', { 
      title: 'Project Details',
      projectId: req.params.id,
      body: ''
    });
  } catch (error) {
    console.error('Project detail error:', error);
    res.status(500).render('pages/500', {
      title: '500 - Server Error',
      error: error,
      env: process.env.NODE_ENV || 'production',
      body: ''
    });
  }
});

// Legends page
app.get('/legends', (req, res) => {
  try {
    res.render('pages/legends', {
      title: 'Legends - Source Code Hub',
      body: ''
    });
  } catch (error) {
    console.error('Legends page error:', error);
    res.status(500).render('pages/500', {
      title: '500 - Server Error',
      error: error,
      env: process.env.NODE_ENV || 'production',
      body: ''
    });
  }
});

// ==================== ADMIN PAGES ====================

// Admin login page
app.get('/admin/login', (req, res) => {
  try {
    if (req.session.isAuthenticated) {
      return res.redirect('/admin/dashboard');
    }
    res.render('pages/admin/login', {
      title: 'Admin Login - Source Code Hub',
      body: ''
    });
  } catch (error) {
    console.error('Admin login page error:', error);
    res.status(500).render('pages/500', {
      title: '500 - Server Error',
      error: error,
      env: process.env.NODE_ENV || 'production',
      body: ''
    });
  }
});

// Admin dashboard
app.get('/admin/dashboard', (req, res) => {
  try {
    if (!req.session.isAuthenticated) {
      return res.redirect('/admin/login');
    }
    res.render('pages/admin/dashboard', {
      title: 'Admin Dashboard - Source Code Hub',
      body: ''
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('pages/500', {
      title: '500 - Server Error',
      error: error,
      env: process.env.NODE_ENV || 'production',
      body: ''
    });
  }
});

// Upload project page
app.get('/admin/projects/upload', (req, res) => {
  try {
    if (!req.session.isAuthenticated) {
      return res.redirect('/admin/login');
    }
    res.render('pages/admin/project-upload', {
      title: 'Upload Project - Admin Dashboard',
      body: ''
    });
  } catch (error) {
    console.error('Project upload page error:', error);
    res.status(500).render('pages/500', {
      title: '500 - Server Error',
      error: error,
      env: process.env.NODE_ENV || 'production',
      body: ''
    });
  }
});

// Edit profile page
app.get('/admin/profile', (req, res) => {
  try {
    if (!req.session.isAuthenticated) {
      return res.redirect('/admin/login');
    }
    res.render('pages/admin/profile', {
      title: 'Edit Profile - Admin Dashboard',
      body: ''
    });
  } catch (error) {
    console.error('Profile page error:', error);
    res.status(500).render('pages/500', {
      title: '500 - Server Error',
      error: error,
      env: process.env.NODE_ENV || 'production',
      body: ''
    });
  }
});

// ==================== API ROUTES ====================

// Try to load API routes, fallback if error
try {
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
  console.log('✅ API Routes loaded successfully');
} catch (error) {
  console.error('❌ Failed to load API routes:', error.message);
  
  // Fallback basic API routes
  app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.status(200).json({ 
      status: 'OK',
      database: dbStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
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
      name: mongoose.connection.name || 'source_code_hub',
      host: mongoose.connection.host,
      models: Object.keys(mongoose.connection.models)
    });
  });
  
  app.get('/api/stats', (req, res) => {
    res.json({
      success: true,
      data: {
        totalProjects: 0,
        totalLikes: 0,
        totalDownloads: 0,
        popularLanguages: []
      }
    });
  });
}

// ==================== FAVICON & STATIC ====================

// Serve favicon
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'images', 'favicon.ico'));
});

// Serve robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send('User-agent: *\nAllow: /\nSitemap: https://' + req.get('host') + '/sitemap.xml');
});

// Serve sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  const baseUrl = 'https://' + req.get('host');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/legends</loc>
    <priority>0.8</priority>
  </url>
</urlset>`);
});

// ==================== ERROR HANDLING ====================

// 404 - Page Not Found with proper error handling
app.use((req, res, next) => {
  try {
    res.status(404).render('pages/404', {
      title: '404 - Page Not Found',
      body: ''
    });
  } catch (error) {
    console.error('404 handler error:', error);
    res.status(404).send('Page not found');
  }
});

// 500 - Server Error with improved error handling
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err.message);
  console.error('📋 Error stack:', err.stack);
  
  try {
    // Template data dengan semua required variables
    const templateData = { 
      title: '500 - Server Error',
      error: process.env.NODE_ENV === 'development' ? err : null,
      env: process.env.NODE_ENV || 'production',
      body: '',
      currentPath: req.path || '/',
      isAuthenticated: req.session?.isAuthenticated || false,
      admin: req.session?.admin || null,
      csrfToken: req.session?.csrfToken || '',
      messages: null
    };
    
    res.status(500).render('pages/500', templateData);
  } catch (renderError) {
    console.error('Error rendering 500 page:', renderError);
    // Fallback to plain text if rendering fails
    res.status(500).send('Internal Server Error');
  }
});

// ==================== PROCESS HANDLING ====================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// ==================== EXPORT & START SERVER ====================

// Export untuk Vercel Serverless Functions
const vercelHandler = (req, res) => {
  return app(req, res);
};

module.exports = vercelHandler;

// Start server untuk development (hanya jika dijalankan langsung)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  
  // Check database connection
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
    console.log(`📊 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected ✅' : 'Disconnected ❌'}`);
    console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Socket.IO: ws://localhost:${PORT}`);
    console.log('='.repeat(50));
    
    console.log('\n📡 Available Routes:');
    console.log('  GET  /                    - Home page');
    console.log('  GET  /legends             - Legends page');
    console.log('  GET  /project/:id         - Project detail');
    console.log('  GET  /admin/login         - Admin login');
    console.log('  GET  /admin/dashboard     - Admin dashboard');
    console.log('  GET  /admin/projects/upload - Upload project');
    console.log('  GET  /admin/profile       - Edit profile');
    console.log('  GET  /api/health          - Health check');
    console.log('  GET  /api/db-status       - Database status');
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
