const crypto = require('crypto');

// Generate unique ID
exports.generateId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

// Format file size
exports.formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date relative
exports.formatRelativeTime = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else {
    return new Date(date).toLocaleDateString();
  }
};

// Sanitize HTML
exports.sanitizeHTML = (str) => {
  if (!str) return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Highlight code syntax (simple version)
exports.highlightCode = (code, language) => {
  // Simple syntax highlighting for common languages
  const keywords = {
    javascript: ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'async', 'await'],
    python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'return'],
    html: ['<!DOCTYPE', '<html', '<head', '<body', '<div', '<span', '<p', '<h1', '<h2', '<a', '<img', '<script', '<style'],
    css: ['@import', '@media', '@keyframes', '.', '#', 'color', 'background', 'font', 'margin', 'padding', 'width', 'height']
  };
  
  let highlighted = code;
  
  if (keywords[language]) {
    keywords[language].forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="keyword">${keyword}</span>`);
    });
  }
  
  // Highlight strings
  highlighted = highlighted.replace(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g, '<span class="string">$1</span>');
  
  // Highlight numbers
  highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
  
  // Highlight comments
  if (language === 'javascript' || language === 'python') {
    highlighted = highlighted.replace(/\/\/.*$/gm, '<span class="comment">$&</span>');
    highlighted = highlighted.replace(/\/\*[\s\S]*?\*\//g, '<span class="comment">$&</span>');
  }
  
  return highlighted;
};

// Generate project badge color based on language
exports.getLanguageColor = (language) => {
  const colors = {
    javascript: '#F7DF1E',
    typescript: '#3178C6',
    python: '#3776AB',
    java: '#007396',
    cpp: '#00599C',
    csharp: '#239120',
    php: '#777BB4',
    ruby: '#CC342D',
    go: '#00ADD8',
    rust: '#000000',
    swift: '#FA7343',
    kotlin: '#7F52FF',
    html: '#E34F26',
    css: '#1572B6',
    vue: '#4FC08D',
    react: '#61DAFB',
    angular: '#DD0031',
    nodejs: '#339933',
    django: '#092E20',
    flask: '#000000',
    laravel: '#FF2D20'
  };
  
  return colors[language.toLowerCase()] || '#6B7280';
};

// Generate avatar placeholder
exports.generateAvatar = (name, size = 100) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
  ];
  
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  const colorIndex = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  return {
    initials,
    color: colors[colorIndex],
    size
  };
};

// Password strength checker
exports.checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    score,
    strength: score >= 4 ? 'strong' : score >= 3 ? 'medium' : 'weak',
    checks
  };
};

// Generate pagination array
exports.generatePagination = (currentPage, totalPages, delta = 2) => {
  const range = [];
  const rangeWithDots = [];
  let l;
  
  range.push(1);
  
  for (let i = currentPage - delta; i <= currentPage + delta; i++) {
    if (i < totalPages && i > 1) {
      range.push(i);
    }
  }
  
  if (totalPages > 1) {
    range.push(totalPages);
  }
  
  range.sort((a, b) => a - b);
  
  for (let i = 0; i < range.length; i++) {
    if (l) {
      if (range[i] - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (range[i] - l !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(range[i]);
    l = range[i];
  }
  
  return rangeWithDots;
};

// Debounce function
exports.debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
exports.throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Validate email
exports.validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Generate secure random string
exports.generateRandomString = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

// Calculate reading time
exports.calculateReadingTime = (text) => {
  const wordsPerMinute = 200;
  const wordCount = text.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return readingTime < 1 ? 1 : readingTime;
};
