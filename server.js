
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
const MONGODB_URI = 'mongodb+srv://braynofficial66_db_user:Oh2ivMc2GGP0SbJF@cluster0.zi2ra3a.mongodb.net/website_db';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Middleware Security
app.use(helmet({
  contentSecurityPolicy: false, // Nonaktifkan untuk development
  crossOriginEmbedderPolicy: false
}));

app.use(compression());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Session Configuration
app.use(session({
  secret: 'source-code-hub-cyberpunk-secret-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    ttl: 24 * 60 * 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Global variables for EJS
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = req.session.isAuthenticated || false;
  res.locals.admin = req.session.admin || null;
  next();
});

// Create HTTP server for Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.IO for real-time features
io.on('connection', (socket) => {
  console.log('New user connected');
  
  socket.on('join-chat', (userId) => {
    socket.join(userId);
  });
  
  socket.on('send-message', (data) => {
    io.to(data.room).emit('receive-message', data);
  });
  
  socket.on('like-project', (projectId) => {
    io.emit('project-liked', projectId);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Attach io to app for use in routes
app.set('io', io);

// Basic Routes
app.get('/', (req, res) => {
  res.render('pages/home');
});

app.get('/project/:id', (req, res) => {
  res.render('pages/project-detail', { projectId: req.params.id });
});

app.get('/legends', (req, res) => {
  res.render('pages/legends');
});

// Admin Routes
app.get('/admin/login', (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.render('pages/admin/login');
});

app.get('/admin/dashboard', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/admin/login');
  }
  res.render('pages/admin/dashboard');
});

app.get('/admin/projects/upload', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/admin/login');
  }
  res.render('pages/admin/project-upload');
});

app.get('/admin/profile', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.redirect('/admin/login');
  }
  res.render('pages/admin/profile');
});

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Error handling
app.use((req, res, next) => {
  res.status(404).render('pages/404');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/500', { 
    error: process.env.NODE_ENV === 'development' ? err : null,
    env: process.env.NODE_ENV
  });
});

// Export untuk Vercel (WAJIB untuk deployment)
module.exports = (req, res) => {
  // Attach io to request
  req.io = io;
  return app(req, res);
};

// Start server untuk development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Visit: http://localhost:${PORT}`);
  });
}
