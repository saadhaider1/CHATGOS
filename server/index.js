const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5002;
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

// Models
const User = require('./models/User');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://courageous-taffy-9bd77b.netlify.app';

// Session configuration for OAuth
app.use(session({
  secret: process.env.SESSION_SECRET || JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true in production with HTTPS
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : [
      "http://localhost:4200", 
      "http://localhost:4201", 
      "http://127.0.0.1:4201",
      "https://chatgos-frontend.netlify.app",
      "https://courageous-taffy-9bd77b.netlify.app"
    ];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.includes(allowed))) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json());

// MongoDB Connection (graceful handling)
let mongoConnected = false;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    mongoConnected = true;
  })
  .catch(err => {
    console.warn('MongoDB not available - using in-memory storage for demo');
    console.warn('To enable persistence, start MongoDB on port 27017');
  });

// In-memory storage fallback
const memoryUsers = new Map();

// ========== OAUTH STRATEGIES ==========

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/google/callback`,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const avatar = profile.photos[0]?.value;
      
      if (mongoConnected) {
        // Check if user exists
        let user = await User.findOne({ email });
        
        if (user) {
          // Update existing user with OAuth info if not already set
          if (!user.providerId) {
            user.provider = 'google';
            user.providerId = profile.id;
            user.isOAuthLinked = true;
            if (avatar) user.avatar = avatar;
            await user.save();
          }
        } else {
          // Create new user
          user = new User({
            username: profile.displayName || email.split('@')[0],
            email: email,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            provider: 'google',
            providerId: profile.id,
            isOAuthLinked: true,
            password: null // No password for OAuth users
          });
          await user.save();
        }
        
        done(null, user);
      } else {
        // In-memory fallback
        let user = Array.from(memoryUsers.values()).find(u => u.email === email);
        
        if (!user) {
          user = {
            _id: 'google_' + profile.id,
            username: profile.displayName || email.split('@')[0],
            email: email,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            provider: 'google',
            providerId: profile.id,
            isOAuthLinked: true
          };
          memoryUsers.set(user._id, user);
        }
        
        done(null, user);
      }
    } catch (error) {
      console.error('Google OAuth error:', error);
      done(error, null);
    }
  }));
  
  console.log('✅ Google OAuth configured');
} else {
  console.log('⚠️ Google OAuth not configured (missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET)');
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/github/callback`,
    scope: ['user:email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0]?.value || `${profile.username}@github.com`;
      const avatar = profile.photos[0]?.value;
      
      if (mongoConnected) {
        // Check if user exists by email or GitHub ID
        let user = await User.findOne({ 
          $or: [
            { email },
            { providerId: profile.id, provider: 'github' }
          ]
        });
        
        if (user) {
          // Update existing user with OAuth info if not already set
          if (!user.providerId) {
            user.provider = 'github';
            user.providerId = profile.id;
            user.isOAuthLinked = true;
            if (avatar) user.avatar = avatar;
            await user.save();
          }
        } else {
          // Create new user
          user = new User({
            username: profile.username || profile.displayName || email.split('@')[0],
            email: email,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            provider: 'github',
            providerId: profile.id,
            isOAuthLinked: true,
            password: null
          });
          await user.save();
        }
        
        done(null, user);
      } else {
        // In-memory fallback
        let user = Array.from(memoryUsers.values()).find(u => 
          u.email === email || (u.providerId === profile.id && u.provider === 'github')
        );
        
        if (!user) {
          user = {
            _id: 'github_' + profile.id,
            username: profile.username || profile.displayName || email.split('@')[0],
            email: email,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            provider: 'github',
            providerId: profile.id,
            isOAuthLinked: true
          };
          memoryUsers.set(user._id, user);
        }
        
        done(null, user);
      }
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      done(error, null);
    }
  }));
  
  console.log('✅ GitHub OAuth configured');
} else {
  console.log('⚠️ GitHub OAuth not configured (missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET)');
}
// Models
const Message = require('./models/Message');
const Group = require('./models/Group');

// In-memory storage fallback
const memoryMessages = [];
const memoryGroups = new Map();
const memoryFriendRequests = new Map();
const memoryFriends = new Map();

// Authentication Routes
// Signup
app.post('/api/auth/signup', [
  body('username').trim().isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user exists
    if (mongoConnected) {
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = new User({
        username,
        email,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        status: 'offline'
      });

      await user.save();

      // Generate token
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      });
    } else {
      // In-memory fallback
      const userId = `user_${Date.now()}`;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = {
        _id: userId,
        username,
        email,
        password: hashedPassword,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        status: 'offline'
      };

      memoryUsers.set(userId, user);

      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        token,
        user: {
          _id: userId,
          username,
          email,
          avatar: user.avatar
        }
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  console.log('Login attempt:', req.body.email);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Login validation errors:', errors.array());
    return res.status(400).json({ message: 'Invalid input', errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    if (mongoConnected) {
      console.log('Searching for user in MongoDB:', email);
      const user = await User.findOne({ email });
      console.log('User search result:', user ? 'User found' : 'User not found');
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log('Comparing passwords for:', email);
      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match result:', isMatch);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      console.log('Generating JWT for:', email);
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
      console.log('JWT generated successfully');

      res.json({
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      });
    } else {
      // In-memory fallback
      console.log('Using in-memory storage, total users:', memoryUsers.size);
      const user = Array.from(memoryUsers.values()).find(u => u.email === email);
      if (!user) {
        console.log('User not found:', email);
        return res.status(400).json({ message: 'Invalid credentials - user not found' });
      }

      console.log('User found:', user.username);
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Password mismatch for:', email);
        return res.status(400).json({ message: 'Invalid credentials - wrong password' });
      }

      console.log('Login successful for:', email);
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar
        }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== OAUTH ROUTES ==========

// Helper function to generate JWT for OAuth users
const generateOAuthToken = (user) => {
  return jwt.sign({ userId: user._id || user.id }, JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to send OAuth success response
const sendOAuthResponse = (res, user) => {
  const token = generateOAuthToken(user);
  
  // Redirect to frontend with token and user data
  const userData = encodeURIComponent(JSON.stringify({
    _id: user._id || user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    provider: user.provider,
    isOAuthLinked: user.isOAuthLinked
  }));
  
  res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
};

// Google OAuth Routes
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    sendOAuthResponse(res, req.user);
  }
);

// GitHub OAuth Routes
app.get('/api/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

app.get('/api/auth/github/callback',
  passport.authenticate('github', { failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    sendOAuthResponse(res, req.user);
  }
);

// Verify Token
app.get('/api/auth/verify', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (mongoConnected) {
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user });
    } else {
      const user = memoryUsers.get(decoded.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Configure multer for chat file uploads (images and files)
const chatFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type || 'file';
    const uploadDir = path.join(__dirname, 'uploads', type === 'image' ? 'images' : 'files');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const type = req.body.type || 'file';
    cb(null, type + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadChatFile = multer({ 
  storage: chatFileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for chat files
  fileFilter: (req, file, cb) => {
    const type = req.body.type;
    if (type === 'image') {
      // Accept only images
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for image upload'));
      }
    } else {
      // Accept all file types for file upload
      cb(null, true);
    }
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Link OAuth to existing account (for users who signed up with email/password)
app.post('/api/auth/link-oauth', authenticateToken, async (req, res) => {
  try {
    const { provider, providerId } = req.body;
    const userId = req.user.userId;
    
    if (!['google', 'github'].includes(provider) || !providerId) {
      return res.status(400).json({ message: 'Invalid provider or providerId' });
    }
    
    if (mongoConnected) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if this OAuth account is already linked to another user
      const existingUser = await User.findOne({ provider, providerId });
      if (existingUser && existingUser._id.toString() !== userId) {
        return res.status(400).json({ message: 'This OAuth account is already linked to another user' });
      }
      
      user.provider = provider;
      user.providerId = providerId;
      user.isOAuthLinked = true;
      await user.save();
      
      res.json({ message: 'OAuth account linked successfully', user });
    } else {
      res.status(503).json({ message: 'MongoDB not connected' });
    }
  } catch (error) {
    console.error('Link OAuth error:', error);
    res.status(500).json({ message: 'Failed to link OAuth account' });
  }
});

// Unlink OAuth from account
app.post('/api/auth/unlink-oauth', authenticateToken, async (req, res) => {
  try {
    const { provider } = req.body;
    const userId = req.user.userId;
    
    if (mongoConnected) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has password set (can't unlink if no password)
      if (!user.password) {
        return res.status(400).json({ message: 'Cannot unlink: No password set. Set a password first.' });
      }
      
      user.provider = 'local';
      user.providerId = null;
      user.isOAuthLinked = false;
      await user.save();
      
      res.json({ message: 'OAuth account unlinked successfully' });
    } else {
      res.status(503).json({ message: 'MongoDB not connected' });
    }
  } catch (error) {
    console.error('Unlink OAuth error:', error);
    res.status(500).json({ message: 'Failed to unlink OAuth account' });
  }
});

// Update user profile with avatar upload
app.put('/api/user/profile', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username } = req.body;
    
    console.log('Profile update request:', { userId, username, file: req.file });
    
    let avatarUrl;
    if (req.file) {
      avatarUrl = `${SERVER_URL}/uploads/avatars/${req.file.filename}`;
      console.log('Avatar uploaded:', avatarUrl);
    }
    
    if (mongoConnected && mongoose.Types.ObjectId.isValid(userId)) {
      const updateData = {};
      if (username) updateData.username = username;
      if (avatarUrl) updateData.avatar = avatarUrl;
      
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true }
      ).select('-password');
      
      res.json({ user });
    } else if (!mongoConnected || !mongoose.Types.ObjectId.isValid(userId)) {
      // In-memory fallback
      const user = memoryUsers.get(userId);
      if (!user) {
        console.log('User not found:', userId);
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (username) user.username = username;
      if (avatarUrl) user.avatar = avatarUrl;
      
      memoryUsers.set(userId, user);
      
      const { password, ...userWithoutPassword } = user;
      console.log('Profile updated:', userWithoutPassword);
      res.json({ user: userWithoutPassword });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile: ' + error.message });
  }
});

// Multer error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Max size is 5MB' });
    }
    return res.status(400).json({ message: error.message });
  }
  next(error);
});

// Upload chat files (images and attachments)
app.post('/api/upload', authenticateToken, uploadChatFile.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const type = req.body.type || 'file';
    const folder = type === 'image' ? 'images' : 'files';
    const fileUrl = `${SERVER_URL}/uploads/${folder}/${req.file.filename}`;

    console.log('File uploaded:', fileUrl);

    res.json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      type
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Failed to upload file: ' + error.message });
  }
});

// Search users by email
app.get('/api/user/search', authenticateToken, async (req, res) => {
  try {
    const { email } = req.query;
    const currentUserId = req.user.userId;
    
    if (!email) {
      return res.status(400).json({ message: 'Email parameter required' });
    }
    
    if (mongoConnected) {
      // Search for users with matching email (case-insensitive partial match)
      const users = await User.find({
        email: { $regex: email, $options: 'i' },
        _id: { $ne: currentUserId } // Exclude current user
      }).select('-password').limit(10);
      
      res.json({ users });
    } else {
      // In-memory fallback
      const users = Array.from(memoryUsers.values())
        .filter(u => 
          u.email.toLowerCase().includes(email.toLowerCase()) && 
          u._id !== currentUserId
        )
        .map(u => {
          const { password, ...userWithoutPassword } = u;
          return userWithoutPassword;
        });
      
      res.json({ users });
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
});

// Friend requests storage (in-memory for demo)
const friendRequests = new Map(); // userId -> [{from, status, timestamp}]
const friends = new Map(); // userId -> [friendIds]

// Send friend request
app.post('/api/friends/request', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    const currentUserId = req.user.userId;
    
    if (!friendId) {
      return res.status(400).json({ message: 'Friend ID required' });
    }
    
    if (friendId === currentUserId) {
      return res.status(400).json({ message: 'Cannot add yourself as friend' });
    }
    
    // Initialize friend requests array if not exists
    if (!friendRequests.has(friendId)) {
      friendRequests.set(friendId, []);
    }
    
    const requests = friendRequests.get(friendId);
    
    // Check if request already sent
    if (requests.some(r => r.from === currentUserId)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }
    
    // Add new request
    requests.push({
      from: currentUserId,
      status: 'pending',
      timestamp: new Date()
    });
    
    res.json({ message: 'Friend request sent' });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ message: 'Failed to send friend request' });
  }
});

// Get friend requests
app.get('/api/friends/requests', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const requests = friendRequests.get(currentUserId) || [];
    
    // Get user details for each request
    const requestsWithUserDetails = await Promise.all(
      requests.map(async (req) => {
        let user;
        if (mongoConnected) {
          user = await User.findById(req.from).select('-password');
        } else {
          const u = memoryUsers.get(req.from);
          if (u) {
            const { password, ...rest } = u;
            user = rest;
          }
        }
        return { ...req, user };
      })
    );
    
    res.json({ requests: requestsWithUserDetails });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Failed to get friend requests' });
  }
});

// Accept/decline friend request
app.post('/api/friends/respond', authenticateToken, async (req, res) => {
  try {
    const { requestId, action } = req.body; // action: 'accept' or 'decline'
    const currentUserId = req.user.userId;
    
    const requests = friendRequests.get(currentUserId) || [];
    const requestIndex = requests.findIndex(r => r.from === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Request not found' });
    }
    
    if (action === 'accept') {
      // Add to friends list
      if (!friends.has(currentUserId)) {
        friends.set(currentUserId, []);
      }
      if (!friends.has(requestId)) {
        friends.set(requestId, []);
      }
      
      friends.get(currentUserId).push(requestId);
      friends.get(requestId).push(currentUserId);
    }
    
    // Remove request
    requests.splice(requestIndex, 1);
    
    res.json({ message: action === 'accept' ? 'Friend added' : 'Request declined' });
  } catch (error) {
    console.error('Respond error:', error);
    res.status(500).json({ message: 'Failed to respond to request' });
  }
});

// Get friends list
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const friendIds = friends.get(currentUserId) || [];
    
    // Get user details for each friend
    const friendsList = await Promise.all(
      friendIds.map(async (friendId) => {
        if (mongoConnected) {
          return await User.findById(friendId).select('-password');
        } else {
          const u = memoryUsers.get(friendId);
          if (u) {
            const { password, ...rest } = u;
            return rest;
          }
        }
      })
    );
    
    res.json({ friends: friendsList.filter(Boolean) });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Failed to get friends' });
  }
});

// Socket.io logic
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', async (userId) => {
    onlineUsers.set(userId, socket.id);
    
    if (mongoConnected && mongoose.Types.ObjectId.isValid(userId)) {
      await User.findByIdAndUpdate(userId, { status: 'online' });
    } else if (!mongoConnected || !mongoose.Types.ObjectId.isValid(userId)) {
      const user = memoryUsers.get(userId) || { _id: userId, status: 'online' };
      user.status = 'online';
      memoryUsers.set(userId, user);
    }
    
    io.emit('user_status', { userId, status: 'online' });
  });

  socket.on('send_message', async (data) => {
    const { sender, recipient, group, content, type } = data;
    
    let savedMessage;
    if (mongoConnected) {
      const newMessage = new Message({ sender, recipient, group, content, type });
      await newMessage.save();
      savedMessage = await newMessage.populate('sender', 'username avatar');
    } else {
      // In-memory fallback
      savedMessage = {
        _id: Date.now().toString(),
        sender: memoryUsers.get(sender) || { _id: sender, username: 'User', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + sender },
        recipient,
        group,
        content,
        type,
        createdAt: new Date()
      };
      memoryMessages.push(savedMessage);
    }

    if (recipient) {
      const recipientSocketId = onlineUsers.get(recipient);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', savedMessage);
      }
    } else if (group) {
      io.to(group).emit('receive_message', savedMessage);
    }
    
    // Always send back to sender for confirmation/sync
    socket.emit('receive_message', savedMessage);
  });

  socket.on('typing', (data) => {
    const { senderId, recipientId, isTyping } = data;
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('user_typing', { senderId, isTyping });
    }
  });

  socket.on('disconnect', async () => {
    let disconnectedUserId = null;
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUserId = userId;
        onlineUsers.delete(userId);
        break;
      }
    }

    if (disconnectedUserId) {
      if (mongoConnected && mongoose.Types.ObjectId.isValid(disconnectedUserId)) {
        await User.findByIdAndUpdate(disconnectedUserId, { status: 'offline', lastSeen: new Date() });
      } else if (!mongoConnected || !mongoose.Types.ObjectId.isValid(disconnectedUserId)) {
        const user = memoryUsers.get(disconnectedUserId);
        if (user) {
          user.status = 'offline';
          user.lastSeen = new Date();
        }
      }
      io.emit('user_status', { userId: disconnectedUserId, status: 'offline' });
    }
    console.log('User disconnected');
  });

  // WebRTC Call Signaling Events
  
  // Initiate a call
  socket.on('call_user', (data) => {
    const { to, signal, callerId, callerName, callerAvatar, type } = data;
    const recipientSocketId = onlineUsers.get(to);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('incoming_call', {
        callerId,
        callerName,
        callerAvatar,
        recipientId: to,
        type,
        signal
      });
      console.log(`Call from ${callerId} to ${to} (${type})`);
    } else {
      // Recipient is offline
      socket.emit('call_failed', { reason: 'User is offline' });
    }
  });

  // Accept a call
  socket.on('accept_call', (data) => {
    const { to, signal } = data;
    const callerSocketId = onlineUsers.get(to);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', { signal });
      console.log(`Call accepted by ${socket.id}`);
    }
  });

  // Reject a call
  socket.on('reject_call', (data) => {
    const { to, reason } = data;
    const callerSocketId = onlineUsers.get(to);
    
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_rejected', { reason });
      console.log(`Call rejected by ${socket.id}: ${reason}`);
    }
  });

  // End a call
  socket.on('end_call', (data) => {
    const { to } = data;
    const recipientSocketId = onlineUsers.get(to);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call_ended');
      console.log(`Call ended by ${socket.id}`);
    }
  });

  // Exchange ICE candidates / signals during call
  socket.on('call_signal', (data) => {
    const { to, signal } = data;
    const recipientSocketId = onlineUsers.get(to);
    
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('call_signal', { signal });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
