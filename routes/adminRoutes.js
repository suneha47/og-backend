const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Order = require("../models/Order");
const auth = require("../middleware/authMiddleware");

// POST /api/admin/register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Admin already exists" });
    const admin = new Admin({ email, password });
    await admin.save();
    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error creating admin", error: err.message });
  }
});

// POST /api/admin/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: "Invalid email or password" });
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });
    const token = jwt.sign({ id: admin._id, email: admin.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// POST /api/admin/change-password
router.post("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Both current and new password are required" });
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: "Current password is incorrect" });
    admin.password = newPassword;
    await admin.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error changing password", error: err.message });
  }
});

// GET /api/admin/customers — list all registered customers (admin)
router.get("/customers", auth, async (req, res) => {
  try {
    const customers = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: "Error fetching customers", error: err.message });
  }
});

// GET /api/admin/stats — overview stats (admin)
router.get("/stats", auth, async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const orders = await Order.find({ status: { $ne: 'cancelled' } });
    const revenue = orders.reduce((s, o) => s + Number(o.total), 0);

    // Last 7 days revenue per day
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const start = new Date(d.setHours(0,0,0,0));
      const end = new Date(d.setHours(23,59,59,999));
      const dayOrders = await Order.find({ createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } });
      const dayRevenue = dayOrders.reduce((s, o) => s + Number(o.total), 0);
      days.push({ date: start.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}), revenue: dayRevenue, orders: dayOrders.length });
    }

    res.json({ totalCustomers, totalOrders, pendingOrders, revenue, days });
  } catch (err) {
    res.status(500).json({ message: "Error fetching stats", error: err.message });
  }
});

// PATCH /api/admin/orders/:id/tracking — save courier + tracking number
router.patch("/orders/:id/tracking", auth, async (req, res) => {
  try {
    const { courierName, trackingNumber } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { tracking: { courierName: courierName || '', trackingNumber: trackingNumber || '' } },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Tracking updated', tracking: order.tracking });
  } catch (err) {
    res.status(500).json({ message: 'Error updating tracking', error: err.message });
  }
});

module.exports = router;
