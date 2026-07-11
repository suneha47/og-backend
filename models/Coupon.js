const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:      { type: String, required: true, unique: true, uppercase: true, trim: true },
  type:      { type: String, enum: ['percent', 'flat'], default: 'percent' },
  value:     { type: Number, required: true },   // % off or flat ₹ off
  minOrder:  { type: Number, default: 0 },
  maxUses:   { type: Number, default: -1 },      // -1 = unlimited
  usedCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  active:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
