const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const adminController = require('../controllers/adminController');
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

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
router.post('/admin/logout', authMiddleware, adminController.logout);
router.get('/admin/check-auth', authMiddleware, adminController.checkAuth);

// ==================== PROTECTED ADMIN ROUTES ====================

// Admin profile management
router.put('/admin/profile', authMiddleware, adminController.updateProfile);
router.put('/admin/password', authMiddleware, adminController.changePassword);
router.put('/admin/photo', authMiddleware, adminController.updatePhoto);

// Project management (admin only)
router.post('/admin/projects', authMiddleware, projectController.createProject);
router.put('/admin/projects/:id', authMiddleware, projectController.updateProject);
router.delete('/admin/projects/:id', authMiddleware, projectController.deleteProject);
router.get('/admin/my-projects', authMiddleware, projectController.getMyProjects);

// Chat management (admin only)
router.get('/admin/chats', authMiddleware, chatController.getAllChats);
router.put('/admin/chats/:chatId/close', authMiddleware, chatController.closeChat);
router.post('/admin/chats/:chatId/reply', authMiddleware, chatController.adminReply);

// Admin stats
router.get('/admin/stats', authMiddleware, adminController.getAdminStats);

// ==================== HEALTH CHECK ====================
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;
