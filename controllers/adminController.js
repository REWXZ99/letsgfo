const Admin = require('../models/Admin');
const Project = require('../models/Project');
const Chat = require('../models/Chat');
const cloudinary = require('cloudinary').v2;

// Admin Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Hardcoded admin credentials (as specified)
    const hardcodedAdmins = {
      'silverhold': { password: 'Rian', name: 'SilverHold Official', role: 'Admin' },
      'braynofficial': { password: 'Plerr321', name: 'Brayn Official', role: 'Owner' }
    };

    const lowerUsername = username.toLowerCase();
    
    // Check hardcoded credentials first
    if (hardcodedAdmins[lowerUsername] && hardcodedAdmins[lowerUsername].password === password) {
      // Find or create admin in database
      let admin = await Admin.findOne({ username: lowerUsername });
      
      if (!admin) {
        admin = await Admin.create({
          username: lowerUsername,
          name: hardcodedAdmins[lowerUsername].name,
          role: hardcodedAdmins[lowerUsername].role,
          password: password // Will be hashed by pre-save hook
        });
      }
      
      // Set session
      req.session.isAuthenticated = true;
      req.session.adminId = admin._id;
      req.session.adminUsername = admin.username;
      req.session.adminRole = admin.role;
      req.session.adminName = admin.name;
      
      // Update online status
      await admin.setOnline();
      
      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          role: admin.role,
          photoUrl: admin.photoUrl,
          quote: admin.quote,
          hashtags: admin.hashtags
        }
      });
    }
    
    // If not hardcoded, check database
    const admin = await Admin.findOne({ username: lowerUsername });
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Set session
    req.session.isAuthenticated = true;
    req.session.adminId = admin._id;
    req.session.adminUsername = admin.username;
    req.session.adminRole = admin.role;
    req.session.adminName = admin.name;
    
    // Update online status
    await admin.setOnline();
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        photoUrl: admin.photoUrl,
        quote: admin.quote,
        hashtags: admin.hashtags
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Admin Logout
exports.logout = async (req, res) => {
  try {
    // Update online status
    if (req.session.adminId) {
      const admin = await Admin.findById(req.session.adminId);
      if (admin) {
        await admin.setOffline();
      }
    }
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout session destroy error:', err);
      }
      res.json({
        success: true,
        message: 'Logout successful'
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Check Auth Status
exports.checkAuth = async (req, res) => {
  try {
    if (!req.session.isAuthenticated) {
      return res.status(401).json({
        success: false,
        isAuthenticated: false
      });
    }
    
    const admin = await Admin.findById(req.session.adminId)
      .select('-password -__v');
    
    if (!admin) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        isAuthenticated: false
      });
    }
    
    res.json({
      success: true,
      isAuthenticated: true,
      data: admin
    });
  } catch (error) {
    console.error('Check auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get All Legends (Public)
exports.getLegends = async (req, res) => {
  try {
    const legends = await Admin.getLegends();
    
    res.json({
      success: true,
      data: legends
    });
  } catch (error) {
    console.error('Get legends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get Legend by Username (Public)
exports.getLegendByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    const legend = await Admin.findOne({ username: username.toLowerCase() })
      .select('-password -__v')
      .exec();
    
    if (!legend) {
      return res.status(404).json({
        success: false,
        message: 'Legend not found'
      });
    }
    
    // Get legend's projects
    const projects = await Project.find({ authorId: legend._id })
      .select('name language type likes downloads createdAt')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      data: {
        ...legend.toObject(),
        projects,
        stats: {
          totalProjects: await Project.countDocuments({ authorId: legend._id }),
          totalLikes: await Project.aggregate([
            { $match: { authorId: legend._id } },
            { $group: { _id: null, total: { $sum: '$likes' } } }
          ]).then(result => result[0]?.total || 0),
          totalDownloads: await Project.aggregate([
            { $match: { authorId: legend._id } },
            { $group: { _id: null, total: { $sum: '$downloads' } } }
          ]).then(result => result[0]?.total || 0)
        }
      }
    });
  } catch (error) {
    console.error('Get legend error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update Admin Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, quote, hashtags } = req.body;
    
    const admin = await Admin.findById(req.session.adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Update fields
    if (name) admin.name = name;
    if (quote !== undefined) admin.quote = quote;
    if (hashtags) {
      admin.hashtags = hashtags.split(',').map(tag => tag.trim());
    }
    
    await admin.save();
    
    // Update session
    req.session.adminName = admin.name;
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: admin.name,
        quote: admin.quote,
        hashtags: admin.hashtags
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update Admin Photo
exports.updatePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo uploaded'
      });
    }
    
    const admin = await Admin.findById(req.session.adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Delete old photo if not default
    if (admin.photoUrl && !admin.photoUrl.includes('default-avatar')) {
      const oldPublicId = admin.photoUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`source-code-hub/avatars/${oldPublicId}`);
    }
    
    // Upload new photo
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'source-code-hub/avatars',
      width: 400,
      height: 400,
      crop: 'fill'
    });
    
    admin.photoUrl = result.secure_url;
    await admin.save();
    
    res.json({
      success: true,
      message: 'Photo updated successfully',
      data: {
        photoUrl: admin.photoUrl
      }
    });
  } catch (error) {
    console.error('Update photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old and new passwords are required'
      });
    }
    
    const admin = await Admin.findById(req.session.adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Check old password
    const isPasswordValid = await admin.comparePassword(oldPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }
    
    // Update password
    admin.password = newPassword;
    await admin.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get Admin Stats
exports.getAdminStats = async (req, res) => {
  try {
    const adminId = req.session.adminId;
    
    const [
      totalProjects,
      totalLikes,
      totalDownloads,
      recentProjects,
      chatStats
    ] = await Promise.all([
      Project.countDocuments({ authorId: adminId }),
      Project.aggregate([
        { $match: { authorId: adminId } },
        { $group: { _id: null, total: { $sum: '$likes' } } }
      ]),
      Project.aggregate([
        { $match: { authorId: adminId } },
        { $group: { _id: null, total: { $sum: '$downloads' } } }
      ]),
      Project.find({ authorId: adminId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name language type likes downloads createdAt'),
      Chat.aggregate([
        { $match: { adminId: adminId } },
        { 
          $group: {
            _id: null,
            totalChats: { $sum: 1 },
            openChats: {
              $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] }
            }
          }
        }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        projects: {
          total: totalProjects,
          likes: totalLikes[0]?.total || 0,
          downloads: totalDownloads[0]?.total || 0,
          recent: recentProjects
        },
        chats: {
          total: chatStats[0]?.totalChats || 0,
          open: chatStats[0]?.openChats || 0
        }
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
