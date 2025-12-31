const express = require('express');
const router = express.Router();

// Import controllers
const projectController = require('../controllers/projectController');
const adminController = require('../controllers/adminController');
const chatController = require('../controllers/chatController');

// Import middleware
const authMiddleware = require('../middleware/auth');
const uploadMiddleware = require('../utils/upload').uploadMiddleware;

// ==================== PUBLIC ROUTES ====================

// Project routes (public)
router.get('/projects', projectController.getProjects);
router.get('/projects/search', projectController.searchProjects);
router.get('/projects/:id', projectController.getProjectById);
router.post('/projects/:id/like', projectController.likeProject);
router.post('/projects/:id/download', projectController.downloadProject);
router.get('/projects/:id/download-file', projectController.downloadFile);

// Legends/Admin profiles (public)
router.get('/legends', adminController.getLegends);
router.get('/legends/:username', adminController.getLegendByUsername);

// Chat routes (public)
router.get('/chats/:userId', chatController.getUserChats);
router.post('/chats', chatController.createChat);
router.post('/chats/:chatId/messages', chatController.sendMessage);
router.get('/chats/admin/:adminId', chatController.getAdminChats);

// Stats (public)
router.get('/stats', projectController.getStats);

// ==================== ADMIN AUTH ROUTES ====================

// Admin authentication
router.post('/admin/login', adminController.login);
router.post('/admin/logout', authMiddleware.requireAuth, adminController.logout);
router.get('/admin/check-auth', authMiddleware.requireAuth, adminController.checkAuth);

// ==================== PROTECTED ADMIN ROUTES ====================

// Admin profile management
router.put('/admin/profile', authMiddleware.requireAuth, adminController.updateProfile);
router.put('/admin/password', authMiddleware.requireAuth, adminController.changePassword);
router.put('/admin/photo', authMiddleware.requireAuth, uploadMiddleware.avatar, adminController.updatePhoto);

// Project management (admin only)
router.post('/admin/projects', authMiddleware.requireAuth, uploadMiddleware.file, projectController.createProject);
router.put('/admin/projects/:id', authMiddleware.requireAuth, projectController.updateProject);
router.delete('/admin/projects/:id', authMiddleware.requireAuth, projectController.deleteProject);
router.get('/admin/my-projects', authMiddleware.requireAuth, projectController.getMyProjects);

// Chat management (admin only)
router.get('/admin/chats', authMiddleware.requireAuth, chatController.getAllChats);
router.put('/admin/chats/:chatId/close', authMiddleware.requireAuth, chatController.closeChat);
router.post('/admin/chats/:chatId/reply', authMiddleware.requireAuth, chatController.adminReply);

// Admin stats
router.get('/admin/stats', authMiddleware.requireAuth, adminController.getAdminStats);

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==================== DATABASE STATUS ====================
router.get('/db-status', (req, res) => {
  const mongoose = require('mongoose');
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    connectionState: states[mongoose.connection.readyState],
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name,
    readyState: mongoose.connection.readyState
  });
});

module.exports = router;
