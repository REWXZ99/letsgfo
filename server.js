
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

const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://api.cloudinary.com"]
    }
  }
}));

app.use(compression());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Session Configuration
app.use(session({
  secret: 'source-code-hub-cyberpunk-secret-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Global variables for EJS
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.isAuthenticated = req.session.isAuthenticated;
  res.locals.admin = req.session.admin;
  next();
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

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Error handling
app.use((req, res, next) => {
  res.status(404).render('pages/404');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/500');
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});
