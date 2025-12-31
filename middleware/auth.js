const Admin = require('../models/Admin');

// Authentication middleware for admin routes
const requireAuth = async (req, res, next) => {
  try {
    // Check session
    if (!req.session.isAuthenticated || !req.session.adminId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Verify admin exists and is active
    const admin = await Admin.findById(req.session.adminId);
    
    if (!admin) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Attach admin info to request
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Role-based authorization middleware
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.session.adminRole) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (!allowedRoles.includes(req.session.adminRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for API routes if needed
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // Generate CSRF token if not exists
  if (!req.session.csrfToken) {
    req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
  }
  
  res.locals.csrfToken = req.session.csrfToken;
  
  // For POST, PUT, DELETE, PATCH requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const clientToken = req.body._csrf || req.headers['x-csrf-token'];
    
    if (!clientToken || clientToken !== req.session.csrfToken) {
      return res.status(403).json({
        success: false,
        message: 'Invalid CSRF token'
      });
    }
  }
  
  next();
};

// File upload validation middleware
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds 10MB limit'
    });
  }
  
  // Check file types for images
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (req.file.mimetype && !allowedImageTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Only JPEG, PNG, GIF, and WebP images are allowed'
    });
  }
  
  next();
};

// Rate limiting per IP middleware
const createRateLimiter = (windowMs, maxRequests) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    
    if (!requests.has(ip)) {
      requests.set(ip, []);
    }
    
    const windowStart = now - windowMs;
    const userRequests = requests.get(ip).filter(time => time > windowStart);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }
    
    userRequests.push(now);
    requests.set(ip, userRequests);
    
    // Cleanup old requests periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      for (const [key, times] of requests.entries()) {
        requests.set(key, times.filter(time => time > windowStart));
      }
    }
    
    next();
  };
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    if (res.statusCode >= 400) {
      console.error(`❌ ${logMessage}`);
    } else if (res.statusCode >= 300) {
      console.warn(`⚠️ ${logMessage}`);
    } else {
      console.log(`✅ ${logMessage}`);
    }
  });
  
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(error => error.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: messages
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = {
  requireAuth,
  requireRole,
  csrfProtection,
  validateFileUpload,
  createRateLimiter,
  requestLogger,
  errorHandler
};
