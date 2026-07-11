const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

const adminRoutes   = require('./routes/adminRoutes');
const productRoutes = require('./routes/productRoutes');
const settingRoutes = require('./routes/settingRoutes');
const userRoutes    = require('./routes/userRoutes');
const orderRoutes   = require('./routes/orderRoutes');
const couponRoutes  = require('./routes/couponRoutes');
const reviewRoutes  = require('./routes/reviewRoutes');

app.use('/api/admin',    adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/coupons',  couponRoutes);
app.use('/api/reviews',  reviewRoutes);

app.get('/', (req, res) => res.json({ status: 'OG Accessories 47 Backend Running ✅', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  setInterval(() => {
    const https = require('https');
    https.get('https://og-backend-2-pytg.onrender.com', () => {
      console.log(`🏓 Self-ping OK at ${new Date().toISOString()}`);
    }).on('error', err => console.error('🔴 Self-ping failed:', err.message));
  }, 5 * 60 * 1000);
});
