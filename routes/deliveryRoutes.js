const express = require('express');
const DeliveryPartner = require('../models/DeliveryPartner');
const Order = require('../models/Order');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/delivery — list all delivery partners (admin)
router.get('/', protect, async (req, res) => {
  try {
    const partners = await DeliveryPartner.find().sort({ createdAt: -1 });
    res.json(partners);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch delivery partners.' });
  }
});

// POST /api/delivery — add new delivery partner (admin)
router.post('/', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required.' });
    const partner = await DeliveryPartner.create({ name, phone });
    res.status(201).json(partner);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add delivery partner.' });
  }
});

// DELETE /api/delivery/:id — remove delivery partner (admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    await DeliveryPartner.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete delivery partner.' });
  }
});

// PATCH /api/delivery/orders/:orderId/assign — assign delivery partner to order (admin)
router.patch('/orders/:orderId/assign', protect, async (req, res) => {
  try {
    const { partnerId } = req.body;
    const partner = partnerId ? await DeliveryPartner.findById(partnerId) : null;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { deliveryPartner: partner ? { partnerId: partner._id, name: partner.name, phone: partner.phone } : null },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ success: true, order, partner });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign delivery partner.' });
  }
});

module.exports = router;
