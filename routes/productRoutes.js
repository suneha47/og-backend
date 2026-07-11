const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Product = require('../models/Product');
const Review = require('../models/Review');
const authMiddleware = require('../middleware/authMiddleware');
const userAuth = require('../middleware/userAuthMiddleware');

cloudinary.config({
  cloud_name: 'dhqy7ibyg',
  api_key:    '263775619532848',
  api_secret: 'RUN5B3wwCPvpGVdCE754OLZYlJQ',
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'og-accessories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── GET ALL PRODUCTS (public) ──
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching products' });
  }
});

// ── GET SINGLE PRODUCT (public) ──
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── UPLOAD IMAGE (protected) ──
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });
    const imageUrl = req.file.path || req.file.secure_url || req.file.url;
    res.json({ url: imageUrl, imageUrl });
  } catch (err) {
    res.status(500).json({ message: 'Image upload failed: ' + err.message });
  }
});

// ── ADD PRODUCT (admin) ──
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, category, price, mrp, description, image, images, stock, sizes, colors } = req.body;
    if (!name || !category || !price)
      return res.status(400).json({ message: 'Name, category and price are required' });
    const product = new Product({
      name, category, price,
      mrp: mrp || null,
      description: description || '',
      image: image || '',
      images: Array.isArray(images) ? images : [],
      stock: (stock !== undefined && stock !== '') ? Number(stock) : -1,
      sizes: Array.isArray(sizes) ? sizes : (sizes ? sizes.split(',').map(s=>s.trim()).filter(Boolean) : []),
      colors: Array.isArray(colors) ? colors : (colors ? colors.split(',').map(c=>c.trim()).filter(Boolean) : []),
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error adding product' });
  }
});

// ── UPDATE PRODUCT (admin) ──
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, category, price, mrp, description, image, images, stock, sizes, colors } = req.body;
    const update = {
      name, category, price,
      mrp: mrp || null,
      description: description || '',
      image: image || '',
      images: Array.isArray(images) ? images : [],
      stock: (stock !== undefined && stock !== '') ? Number(stock) : -1,
      sizes: Array.isArray(sizes) ? sizes : (sizes ? sizes.split(',').map(s=>s.trim()).filter(Boolean) : []),
      colors: Array.isArray(colors) ? colors : (colors ? colors.split(',').map(c=>c.trim()).filter(Boolean) : []),
    };
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// ── DELETE PRODUCT (admin) ──
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (product.image) {
      try {
        const parts = product.image.split('/');
        const filename = parts[parts.length - 1];
        const publicId = 'og-accessories/' + filename.split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      } catch (e) { /* ignore */ }
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting product' });
  }
});

// ── GET REVIEWS FOR A PRODUCT (public) ──
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.id }).sort({ createdAt: -1 }).limit(50);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});

// ── ADD REVIEW (user auth) ──
router.post('/:id/reviews', userAuth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
    const existing = await Review.findOne({ productId: req.params.id, userId: req.user.id });
    if (existing) return res.status(400).json({ message: 'You have already reviewed this product.' });
    const review = await Review.create({
      productId: req.params.id,
      userId: req.user.id,
      name: req.user.name || 'Customer',
      rating: Number(rating),
      comment: comment || '',
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: 'Error adding review' });
  }
});

module.exports = router;
