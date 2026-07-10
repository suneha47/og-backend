const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  customer: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    email:   { type: String, default: '' },
    address: { type: String, required: true },
  },
  items: [{
    product: { type: String },
    name:    { type: String, required: true },
    price:   { type: Number, required: true },
    qty:     { type: Number, required: true, min: 1 },
  }],
  total:   { type: Number, required: true },
  payment: {
    method:    { type: String, enum: ['cod', 'upi', 'razorpay'], default: 'cod' },
    status:    { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentId: { type: String, default: '' },
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Auto-generate short order ID before save
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = 'OG' + String(count + 1).padStart(4, '0');
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
