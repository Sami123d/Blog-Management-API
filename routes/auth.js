const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const createAccessToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
const createRefreshToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.REFRESH_EXPIRES_IN });

// Register
router.post('/register', [
  body('name').notEmpty(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
    console.log("regoster chl gyi")
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password, role } = req.body;
  console.log(req.body, "reqbppdy")
  try {
    let user = await User.findOne({ email });
    console.log(user,"userr")
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashed, role });
    console.log(user, "userrop");
    
    await user.save();

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    console.log(accessToken, "sccess");
console.log(refreshToken, "refrsh");

    // Optionally store refresh tokens (DB) for invalidation — omitted for speed
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// Refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const accessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user); // rotate refresh token

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

module.exports = router;
