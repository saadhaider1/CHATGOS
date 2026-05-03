const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional for OAuth users
  avatar: { type: String, default: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default' },
  status: { type: String, enum: ['online', 'offline'], default: 'offline' },
  lastSeen: { type: Date, default: Date.now },
  
  // OAuth fields
  provider: { 
    type: String, 
    enum: ['local', 'google', 'github'], 
    default: 'local' 
  },
  providerId: { type: String, sparse: true }, // OAuth provider user ID
  
  // For accounts that have both OAuth and password
  isOAuthLinked: { type: Boolean, default: false }
}, { timestamps: true });

// Create compound index for OAuth provider lookups
UserSchema.index({ provider: 1, providerId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', UserSchema);
