const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
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
    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting review.' });
  }
});

module.exports = router;
