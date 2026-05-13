const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// — CORS —
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// — BODY PARSERS —
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// — MONGODB CONNECTION —
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// — ROUTES —
const adminRoutes   = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const settingRoutes = require('./routes/settingRoutes');

app.use('/api/admin',    adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/settings', settingRoutes);

// — HEALTH CHECK —
app.get('/', (req, res) => {
  res.json({
    status: 'OG Accessories 47 Backend Running ✅',
    timestamp: new Date().toISOString(),
  });
});

// — START SERVER —
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // — SELF PING every 5 mins to prevent Render free tier sleep —
  setInterval(() => {
    const https = require('https');
    https.get('https://og-backend-2-pytg.onrender.com', (res) => {
      console.log(`🏓 Self-ping OK at ${new Date().toISOString()}`);
    }).on('error', (err) => {
      console.error('🔴 Self-ping failed:', err.message);
    });
  }, 5 * 60 * 1000);
});
