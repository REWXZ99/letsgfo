const Project = require('../models/Project');
const Admin = require('../models/Admin');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Get all projects with pagination and filtering
exports.getProjects = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, language, sort = 'newest' } = req.query;
    
    const query = {};
    
    // Filter by type
    if (type && ['CODE', 'FILE'].includes(type)) {
      query.type = type;
    }
    
    // Filter by language
    if (language) {
      query.language = new RegExp(language, 'i');
    }
    
    // Sort options
    let sortOption = {};
    switch (sort) {
      case 'popular':
        sortOption = { likes: -1, downloads: -1 };
        break;
      case 'most-downloaded':
        sortOption = { downloads: -1 };
        break;
      case 'most-liked':
        sortOption = { likes: -1 };
        break;
      default: // newest
        sortOption = { createdAt: -1 };
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: sortOption,
      populate: {
        path: 'authorId',
        select: 'name photoUrl role'
      }
    };
    
    // Using pagination
    const projects = await Project.paginate(query, options);
    
    res.json({
      success: true,
      data: projects.docs,
      pagination: {
        total: projects.totalDocs,
        page: projects.page,
        totalPages: projects.totalPages,
        hasNext: projects.hasNextPage,
        hasPrev: projects.hasPrevPage
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Search projects
exports.searchProjects = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    const searchQuery = {
      $text: { $search: q }
    };
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { score: { $meta: 'textScore' } },
      populate: {
        path: 'authorId',
        select: 'name photoUrl role'
      }
    };
    
    const projects = await Project.paginate(searchQuery, options);
    
    res.json({
      success: true,
      data: projects.docs,
      pagination: {
        total: projects.totalDocs,
        page: projects.page,
        totalPages: projects.totalPages
      }
    });
  } catch (error) {
    console.error('Search projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get single project by ID
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findById(id)
      .populate('authorId', 'name photoUrl role quote hashtags')
      .exec();
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Increment view count (optional)
    project.views = (project.views || 0) + 1;
    await project.save();
    
    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Like a project
exports.likeProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Use session or IP for simple rate limiting (no login required)
    const userIdentifier = req.ip || req.session.id;
    
    // Simple in-memory like tracking (in production use Redis)
    if (!req.session.likedProjects) {
      req.session.likedProjects = [];
    }
    
    if (req.session.likedProjects.includes(id)) {
      return res.status(400).json({
        success: false,
        message: 'Already liked this project'
      });
    }
    
    await project.incrementLikes();
    req.session.likedProjects.push(id);
    
    res.json({
      success: true,
      message: 'Project liked successfully',
      likes: project.likes
    });
  } catch (error) {
    console.error('Like project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Download a project
exports.downloadProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    await project.incrementDownloads();
    
    res.json({
      success: true,
      message: 'Download counted successfully',
      downloads: project.downloads,
      downloadUrl: project.type === 'CODE' 
        ? `/api/projects/${id}/download-file`
        : project.fileUrl
    });
  } catch (error) {
    console.error('Download project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Download file (for CODE type)
exports.downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findById(id);
    
    if (!project || project.type !== 'CODE') {
      return res.status(404).json({
        success: false,
        message: 'Project not found or not a CODE type'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/\s+/g, '-').toLowerCase()}.txt"`);
    
    // Send the code content
    res.send(project.content);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Create project (admin only)
exports.createProject = async (req, res) => {
  try {
    const { 
      name, 
      language, 
      type, 
      content, 
      notes, 
      previewUrl,
      tags 
    } = req.body;
    
    // Validation
    if (!name || !language || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name, language, and type are required'
      });
    }
    
    if (type === 'CODE' && !content) {
      return res.status(400).json({
        success: false,
        message: 'Content is required for CODE type'
      });
    }
    
    let fileUrl = null;
    
    // Handle FILE upload
    if (type === 'FILE' && req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'raw',
        folder: 'source-code-hub/files'
      });
      fileUrl = result.secure_url;
    }
    
    const projectData = {
      name,
      language,
      type,
      notes,
      previewUrl,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      authorId: req.session.adminId
    };
    
    if (type === 'CODE') {
      projectData.content = content;
    } else if (type === 'FILE') {
      projectData.fileUrl = fileUrl || req.body.fileUrl;
      
      if (!projectData.fileUrl) {
        return res.status(400).json({
          success: false,
          message: 'File URL or upload is required for FILE type'
        });
      }
    }
    
    const project = await Project.create(projectData);
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update project (admin only)
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if admin owns this project
    if (project.authorId.toString() !== req.session.adminId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }
    
    // Update project
    Object.assign(project, updateData);
    await project.save();
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Delete project (admin only)
exports.deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await Project.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }
    
    // Check if admin owns this project
    if (project.authorId.toString() !== req.session.adminId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project'
      });
    }
    
    // If it's a FILE type, delete from Cloudinary
    if (project.type === 'FILE' && project.fileUrl) {
      const publicId = project.fileUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`source-code-hub/files/${publicId}`, {
        resource_type: 'raw'
      });
    }
    
    await project.deleteOne();
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get projects by current admin
exports.getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({ authorId: req.session.adminId })
      .sort({ createdAt: -1 })
      .populate('authorId', 'name photoUrl role');
    
    res.json({
      success: true,
      data: projects
    });
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get platform stats
exports.getStats = async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const totalLikes = await Project.aggregate([
      { $group: { _id: null, total: { $sum: '$likes' } } }
    ]);
    const totalDownloads = await Project.aggregate([
      { $group: { _id: null, total: { $sum: '$downloads' } } }
    ]);
    
    const popularLanguages = await Project.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      success: true,
      data: {
        totalProjects,
        totalLikes: totalLikes[0]?.total || 0,
        totalDownloads: totalDownloads[0]?.total || 0,
        popularLanguages
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
