const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorizeRoles = require('../middleware/roles');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const mongoose = require('mongoose');
const ImageKit = require("imagekit");

// Public: get published posts with search & pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const { search, tags, sortBy = 'createdAt', order = 'desc', author, cat } = req.query;

    const filter = { status: 'published' };

    // 🔍 Full-text search
    if (search) filter.$text = { $search: search };

    // 🏷️ Tags filter
    if (tags) filter.tags = { $in: tags.split(',') };

    // 👤 Author Filter
    if (author) filter.author = author;

       if (cat) filter.category = cat;

    console.log("FINAL FILTER:", filter);

    // Parallel fetch + count
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name'),

      Post.countDocuments(filter)
    ]);

    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: skip + posts.length < total,
        hasPrev: page > 1
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// CREATE IMAGEKIT INSTANCE
const imagekit = new ImageKit({
  publicKey: process.env.VITE_IK_PUBLIC_KEY,
  privateKey: process.env.PRIVATE_KEY,
  urlEndpoint: process.env.VITE_IK_URL_ENDPOINT,
});

// ---------- UPLOAD AUTH ROUTE ---------- //
router.get("/upload-auth", (req, res) => {
  try {
    const authParams = imagekit.getAuthenticationParameters();
    return res.status(200).json(authParams);
  } catch (error) {
    console.error("Upload Auth Error:", error);
    return res.status(500).json({ message: "Auth generation failed" });
  }
});

// Get single post by slug
// GET SINGLE POST BY SLUG
router.get("/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug })
      .populate("author", "name");

    if (!post) {
      return res.status(404).json({ message: "Post not found!" });
    }

    res.status(200).json(post);

  } catch (error) {
    console.error("Error fetching single post:", error);
    res.status(500).json({ message: "Server error" });
  }
});



// Author's posts (draft + published)
router.get('/my', auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user.id }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Create post (author/admin)
router.post('/', auth, authorizeRoles('author','admin'), async (req, res) => {
  try {
    const { 
      title, 
      category, 
      description, 
      content, 
      img, 
      tags = [], 
      status = 'draft' 
    } = req.body;

    const slug = title.toLowerCase().replace(/\s+/g,'-') + '-' + Date.now().toString().slice(-4);

    const post = new Post({
      title,
      slug,
      category,
      description,
      content,
      img,
      tags,
      status,
      author: req.user.id
    });

    await post.save();
    res.status(201).json(post);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update post (owner or admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') 
      return res.status(403).json({ message: 'Not allowed' });

const allowed = ['title','category','description','content','tags','status','img'];
    allowed.forEach(k => { if (req.body[k] !== undefined) post[k] = req.body[k]; });
    await post.save();
    res.json(post);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Delete post (owner or admin)
router.delete('/:id', auth, async (req,res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: 'Deleted' });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Patch status (publish/unpublish)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft','published'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'Not allowed' });
    post.status = status;
    await post.save();
    res.json(post);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Comments: get and add
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id }).populate('author', 'name');
    res.json(comments);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = new Comment({ content, author: req.user.id, post: req.params.id });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Aggregation: stats
router.get('/stats/posts', async (req,res) => {
  try {
    const agg = await Post.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const total = await Post.countDocuments();
    const topAuthors = await Post.aggregate([
      { $group: { _id: '$author', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { count: 1, 'user.name': 1, 'user._id': 1 } }
    ]);
    res.json({ totalPosts: total, byStatus: agg, topAuthors });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
