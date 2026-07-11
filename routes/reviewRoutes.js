const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const protect = require('../middleware/authMiddleware');

// GET /api/reviews/all — all reviews (admin)
router.get('/all', protect, async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).populate('productId', 'name');
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reviews.' });
  }
});

// DELETE /api/reviews/:id (admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (review) {
      const remaining = await Review.find({ productId: review.productId });
      const avg = remaining.length ? remaining.reduce((s, r) => s + r.rating, 0) / remaining.length : 0;
      await Product.findByIdAndUpdate(review.productId, {
        avgRating: Math.round(avg * 10) / 10,
        reviewCount: remaining.length,
      });
    }
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting review.' });
  }
});

module.exports = router;
