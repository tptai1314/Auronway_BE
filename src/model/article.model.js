const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const articleSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  content: { type: String, required: true },
  excerpt: { type: String },
  
  // Media
  featured_image: { type: String },
  images: [{ type: String }],
  
  // Source & Author
  source: { type: String },
  author_id: { type: Schema.Types.ObjectId, ref: 'User' },
  author_name: { type: String },
  
  // Categories
  category: { 
    type: String, 
    enum: ['TOP_NEWS', 'HIGHLIGHTS', 'TRENDING', 'GENERAL'],
    default: 'GENERAL'
  },
  tags: [{ type: String }],
  
  // Engagement
  view_count: { type: Number, default: 0 },
  like_count: { type: Number, default: 0 },
  comment_count: { type: Number, default: 0 },
  
  // Featured settings
  is_featured: { type: Boolean, default: false },
  is_trending: { type: Boolean, default: false },
  featured_order: { type: Number },
  
  // Styling
  color: { type: String },
  
  // Publishing
  status: { 
    type: String, 
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT'
  },
  published_at: { type: Date },
  
  is_active: { type: Boolean, default: true }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
articleSchema.index({ tenant_id: 1, status: 1, published_at: -1 });
articleSchema.index({ slug: 1 });
articleSchema.index({ category: 1, is_active: 1 });
articleSchema.index({ is_trending: 1, view_count: -1 });

// Virtual for time ago
articleSchema.virtual('time_ago').get(function() {
  if (!this.published_at) return '';
  
  const now = new Date();
  const diff = now - this.published_at;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (months > 0) return `${months}m ago`;
  if (weeks > 0) return `${weeks}w ago`;
  if (days > 0) return `${days}d ago`;
  return 'Today';
});

articleSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Article', articleSchema);
