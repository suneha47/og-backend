const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const userProtect = require('../middleware/userAuthMiddleware');
const { sendPasswordResetEmail } = require('../utils/mailer');

const router = express.Router();

const makeToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, email: user.email, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

const userPayload = (user, token) => ({
  token,
  user: {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    city: user.city,
    pin: user.pin,
  },
});

// POST /api/users/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password)
      return res.status(400).json({ message: 'All fields are required.' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = await User.create({ name, email, phone, password });
    res.status(201).json(userPayload(user, makeToken(user)));
  } catch (err) {
    res.status(500).json({ message: 'Signup failed. Please try again.' });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Incorrect email or password.' });

    res.json(userPayload(user, makeToken(user)));
  } catch (err) {
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});

// GET /api/users/me
router.get('/me', userProtect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
});

// PUT /api/users/me  (update profile / saved address)
router.put('/me', userProtect, async (req, res) => {
  try {
    const { name, phone, address, city, pin } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (name)    user.name    = name;
    if (phone)   user.phone   = phone;
    if (address !== undefined) user.address = address;
    if (city    !== undefined) user.city    = city;
    if (pin     !== undefined) user.pin     = pin;

    await user.save();
    res.json(userPayload(user, makeToken(user)));
  } catch (err) {
    res.status(500).json({ message: 'Update failed.' });
  }
});

// POST /api/users/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond OK so we don't leak whether email exists
    if (!user) return res.json({ message: 'If this email is registered, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || 'https://og-frontend.vercel.app'}/?reset=${token}`;
    await sendPasswordResetEmail(user, resetUrl);

    res.json({ message: 'If this email is registered, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/users/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and new password are required.' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });

    const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired.' });

    user.password = password;
    user.resetToken = '';
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
