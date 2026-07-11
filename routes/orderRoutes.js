const express = require('express');
const Order = require('../models/Order');
const Coupon = require('../models/Coupon');
const Product = require('../models/Product');
const protect = require('../middleware/authMiddleware');
const userProtect = require('../middleware/userAuthMiddleware');
const { sendOrderNotification, sendCustomerConfirmation } = require('../utils/mailer');

const router = express.Router();

// POST /api/orders — place order (public)
router.post('/', async (req, res) => {
  try {
    const { customer, items, total, payment, userId, couponCode } = req.body;
    if (!customer?.name || !customer?.phone || !customer?.address || !items?.length || !total)
      return res.status(400).json({ message: 'Missing required order details.' });

    // Apply coupon if provided
    let couponDiscount = 0;
    let finalTotal = Number(total);
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), active: true });
      if (coupon) {
        const now = new Date();
        const valid = (!coupon.expiresAt || coupon.expiresAt > now) &&
                      (coupon.maxUses === -1 || coupon.usedCount < coupon.maxUses) &&
                      (finalTotal >= (coupon.minOrder || 0));
        if (valid) {
          couponDiscount = coupon.type === 'percent'
            ? Math.round(finalTotal * coupon.value / 100)
            : Math.min(coupon.value, finalTotal);
          finalTotal = Math.max(0, finalTotal - couponDiscount);
          await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    const order = await Order.create({
      customer, items, total: finalTotal, payment,
      userId: userId || null,
      couponCode: couponCode || '',
      couponDiscount,
    });

    res.status(201).json({ success: true, orderId: order.orderId, _id: order._id, total: finalTotal, couponDiscount });

    // Non-blocking: deduct stock + send emails
    (async () => {
      for (const item of items) {
        // Only deduct if stock is finite (not -1)
        await Product.findOneAndUpdate(
          { _id: item.product, stock: { $gt: 0 } },
          { $inc: { stock: -Math.max(1, item.qty) } }
        ).catch(() => {});
      }
    })();
    sendOrderNotification(order).catch(e => console.error('[MAILER ADMIN]', e.message));
    sendCustomerConfirmation(order).catch(e => console.error('[MAILER CUSTOMER]', e.message));

  } catch (err) {
    res.status(500).json({ message: 'Failed to place order.' });
  }
});

// GET /api/orders/mine — customer's own orders
router.get('/mine', userProtect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your orders.' });
  }
});

// PUT /api/orders/:id/cancel — customer cancels own order
router.put('/:id/cancel', userProtect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.user.id });
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    if (!['pending', 'confirmed'].includes(order.status))
      return res.status(400).json({ message: 'This order cannot be cancelled anymore.' });
    order.status = 'cancelled';
    await order.save();
    res.json({ success: true, message: 'Order cancelled.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel order.' });
  }
});

// GET /api/orders — all orders (admin)
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
});

// PUT /api/orders/:id/status — update status (admin)
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
