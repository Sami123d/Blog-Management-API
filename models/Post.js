const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, index: 'text' },
  img: { type: String },

  category: { type: String, required: true },   // ADD ✔
  description: { type: String },                // ADD ✔

  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft','published'], default: 'draft' },
  tags: [{ type: String }],
}, { timestamps: true });
// text index for search
postSchema.index({ title: 'text', content: 'text'});

module.exports = mongoose.model('Post', postSchema);
