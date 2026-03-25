const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User'}, // Đã khai báo index ở dưới
  
  // Content
  title: { type: String, required: true },
  message: String,
  type: { 
    type: String, 
    enum: ['EVENT_INVITE', 'REVIEW_REQUEST', 'CERTIFICATE_AWARDED', 'LEVEL_UP', 'QUEST_COMPLETE', 'SYSTEM'],
    required: true 
  },
  
  // Action
  action_url: String, // Deep link to relevant screen
  action_label: String,
  metadata: Map, // Additional data for the notification
  
  // Status
  status: { 
    type: String, 
    enum: ['UNREAD', 'READ', 'ACTION_TAKEN', 'DISMISSED'], 
    default: 'UNREAD' 
  },
  read_at: Date,
  action_taken_at: Date,
  
  // Expiry
  expires_at: Date,
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
    organizer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organizer', required: true }
}, { 
  timestamps: true 
});

// Indexes
notificationSchema.index({ user_id: 1, status: 1 });
notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('Notification', notificationSchema);