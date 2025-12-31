const Chat = require('../models/Chat');
const Admin = require('../models/Admin');
const { v4: uuidv4 } = require('uuid');

// Get user chats (no login required)
exports.getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Generate userId if not provided (for new users)
    const userIdentifier = userId || `USER${Math.floor(Math.random() * 10000)}`;
    
    const chats = await Chat.find({ 
      userId: userIdentifier,
      status: { $in: ['open', 'closed'] }
    })
    .sort({ updatedAt: -1 })
    .populate('adminId', 'name photoUrl role isOnline')
    .limit(20);
    
    res.json({
      success: true,
      data: {
        userId: userIdentifier,
        chats
      }
    });
  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Create new chat (no login required)
exports.createChat = async (req, res) => {
  try {
    const { userId, adminId, message } = req.body;
    
    if (!adminId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Admin ID and message are required'
      });
    }
    
    // Generate userId if not provided
    const userIdentifier = userId || `USER${Math.floor(Math.random() * 10000)}`;
    
    // Check if admin exists
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Create chat
    const chat = await Chat.create({
      userId: userIdentifier,
      adminId,
      messages: [{
        sender: 'user',
        content: message,
        timestamp: new Date()
      }],
      status: 'open'
    });
    
    // Auto-reply from admin (simulated)
    setTimeout(async () => {
      const autoReplies = [
        "Halo! Terima kasih telah menghubungi saya. Saya akan membalas pesan Anda segera.",
        "Hai! Saya sedang online. Ada yang bisa saya bantu?",
        "Terima kasih pesannya. Saya sedang memeriksa dan akan segera merespon.",
        "Halo! Saya menerima pesan Anda. Mohon tunggu sebentar ya."
      ];
      
      const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
      
      await Chat.findByIdAndUpdate(chat._id, {
        $push: {
          messages: {
            sender: 'admin',
            content: randomReply,
            timestamp: new Date()
          }
        }
      });
    }, 2000);
    
    const populatedChat = await Chat.findById(chat._id)
      .populate('adminId', 'name photoUrl role isOnline');
    
    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: {
        userId: userIdentifier,
        chat: populatedChat
      }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Send message in chat (no login required)
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message, userId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Add user message
    chat.messages.push({
      sender: 'user',
      content: message,
      timestamp: new Date()
    });
    
    await chat.save();
    
    // Auto-reply from admin (simulated with delay)
    setTimeout(async () => {
      const autoReplies = [
        "Saya memahami pertanyaan Anda. Biarkan saya cek terlebih dahulu.",
        "Terima kasih untuk informasinya. Saya akan proses ini.",
        "Baik, saya catat permintaan Anda. Apakah ada hal lain?",
        "Pesan Anda sudah saya terima. Mohon tunggu konfirmasi selanjutnya."
      ];
      
      const randomReply = autoReplies[Math.floor(Math.random() * autoReplies.length)];
      
      await Chat.findByIdAndUpdate(chatId, {
        $push: {
          messages: {
            sender: 'admin',
            content: randomReply,
            timestamp: new Date()
          }
        },
        $set: { updatedAt: new Date() }
      });
    }, 1500);
    
    res.json({
      success: true,
      message: 'Message sent successfully',
      data: chat
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get admin chats (admin only)
exports.getAdminChats = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { status = 'open', page = 1, limit = 20 } = req.query;
    
    const query = { adminId };
    
    if (status !== 'all') {
      query.status = status;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { updatedAt: -1 },
      populate: {
        path: 'adminId',
        select: 'name photoUrl role'
      }
    };
    
    const chats = await Chat.paginate(query, options);
    
    res.json({
      success: true,
      data: chats.docs,
      pagination: {
        total: chats.totalDocs,
        page: chats.page,
        totalPages: chats.totalPages,
        hasNext: chats.hasNextPage,
        hasPrev: chats.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Get admin chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all chats for dashboard (admin only)
exports.getAllChats = async (req, res) => {
  try {
    const { status, page = 1, limit = 30 } = req.query;
    
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { updatedAt: -1 },
      populate: [
        {
          path: 'adminId',
          select: 'name photoUrl role'
        }
      ]
    };
    
    const chats = await Chat.paginate(query, options);
    
    res.json({
      success: true,
      data: chats.docs,
      pagination: {
        total: chats.totalDocs,
        page: chats.page,
        totalPages: chats.totalPages
      }
    });
  } catch (error) {
    console.error('Get all chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Close chat (admin only)
exports.closeChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Check if admin owns this chat
    if (chat.adminId.toString() !== req.session.adminId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to close this chat'
      });
    }
    
    chat.status = 'closed';
    chat.closedAt = new Date();
    await chat.save();
    
    res.json({
      success: true,
      message: 'Chat closed successfully'
    });
  } catch (error) {
    console.error('Close chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Admin reply in chat (admin only)
exports.adminReply = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }
    
    // Check if admin owns this chat
    if (chat.adminId.toString() !== req.session.adminId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reply in this chat'
      });
    }
    
    // Add admin message
    chat.messages.push({
      sender: 'admin',
      content: message,
      timestamp: new Date()
    });
    
    chat.status = 'open';
    await chat.save();
    
    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: chat
    });
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
