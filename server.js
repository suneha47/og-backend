const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ── CORS ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── BODY PARSERS ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── MONGODB CONNECTION ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── ROUTES ──
const adminRoutes   = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');

app.use('/api/admin',    adminRoutes);
app.use('/api/products', productRoutes);

// ── HEALTH CHECK ──
app.get('/', (req, res) => {
  res.json({
    status: 'OG Accessories 47 Backend Running ✅',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 HANDLER ──
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// ── START ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
