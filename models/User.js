const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin','author'], default: 'author' },
}, { timestamps: { createdAt: 'createdAt' }});

module.exports = mongoose.model('User', userSchema);
