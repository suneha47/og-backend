const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const protect = require('../middleware/authMiddleware');

// POST /api/coupons/validate — validate & preview discount (public)
router.post('/validate', async (req, res) => {
  try {
    const { code, total } = req.body;
    if (!code) return res.status(400).json({ message: 'Coupon code required.' });
    const coupon = await Coupon.findOne({ code: code.toUpperCase().trim(), active: true });
    if (!coupon) return res.status(404).json({ message: 'Invalid or expired coupon code.' });

    const now = new Date();
    if (coupon.expiresAt && coupon.expiresAt < now)
      return res.status(400).json({ message: 'This coupon has expired.' });
    if (coupon.maxUses !== -1 && coupon.usedCount >= coupon.maxUses)
      return res.status(400).json({ message: 'This coupon has reached its usage limit.' });
    if (Number(total) < (coupon.minOrder || 0))
      return res.status(400).json({ message: `Minimum order ₹${coupon.minOrder} required for this coupon.` });

    const discount = coupon.type === 'percent'
      ? Math.round(Number(total) * coupon.value / 100)
      : Math.min(coupon.value, Number(total));

    res.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount,
      newTotal: Math.max(0, Number(total) - discount),
      message: coupon.type === 'percent' ? `${coupon.value}% off applied!` : `₹${coupon.value} off applied!`,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error validating coupon.' });
  }
});

// GET /api/coupons — list all (admin)
router.get('/', protect, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching coupons.' });
  }
});

// POST /api/coupons — create (admin)
router.post('/', protect, async (req, res) => {
  try {
    const { code, type, value, minOrder, maxUses, expiresAt } = req.body;
    if (!code || !value) return res.status(400).json({ message: 'Code and value are required.' });
    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      type: type || 'percent',
      value: Number(value),
      minOrder: Number(minOrder) || 0,
      maxUses: maxUses ? Number(maxUses) : -1,
      expiresAt: expiresAt || null,
    });
    res.status(201).json(coupon);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Coupon code already exists.' });
    res.status(500).json({ message: 'Error creating coupon.' });
  }
});

// PUT /api/coupons/:id — update / toggle active (admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found.' });
    res.json(coupon);
  } catch (err) {
    res.status(500).json({ message: 'Error updating coupon.' });
  }
});

// DELETE /api/coupons/:id (admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting coupon.' });
  }
});

module.exports = router;
