const express = require('express');
const Order = require('../models/Order');
const protect = require('../middleware/authMiddleware');
const userProtect = require('../middleware/userAuthMiddleware');
const { sendOrderNotification } = require('../utils/mailer');

const router = express.Router();

// POST /api/orders — place order (public)
router.post('/', async (req, res) => {
  try {
    const { customer, items, total, payment, userId } = req.body;
    if (!customer?.name || !customer?.phone || !customer?.address || !items?.length || !total)
      return res.status(400).json({ message: 'Missing required order details.' });
    const order = await Order.create({ customer, items, total, payment, userId: userId || null });
    res.status(201).json({ success: true, orderId: order.orderId, _id: order._id });
    // Send email notification (non-blocking)
    sendOrderNotification(order).catch(e => console.error('[MAILER ERROR]', e.message));
  } catch (err) {
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// GET /api/orders/mine — customer's own orders (user login required)
router.get('/mine', userProtect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your orders.' });
  }
});

// GET /api/orders — all orders (admin only)
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
});

// PUT /api/orders/:id/status — update status (admin only)
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status.' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order.' });
  }
});

module.exports = router;
