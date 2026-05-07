const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware');

// ── CLOUDINARY CONFIG (hardcoded for reliability) ──
cloudinary.config({
  cloud_name: 'dhqy7ibyg',
  api_key:    '263775619532848',
  api_secret: 'RUN5B3wwCPvpGVdCE7540LZYlJQ',
});

// ── MULTER + CLOUDINARY STORAGE ──
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'og-accessories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

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
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }
    const imageUrl = req.file.path || req.file.secure_url || req.file.url;
    res.json({ imageUrl });
  } catch (err) {
    res.status(500).json({ message: 'Image upload failed: ' + err.message });
  }
});

// ── ADD PRODUCT (protected) ──
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, category, price, description, image } = req.body;
    if (!name || !category || !price) {
      return res.status(400).json({ message: 'Name, category and price are required' });
    }
    const product = new Product({ name, category, price, description, image });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error adding product' });
  }
});

// ── UPDATE PRODUCT (protected) ──
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, category, price, description, image } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, category, price, description, image },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: 'Server error updating product' });
  }
});

// ── DELETE PRODUCT (protected) ──
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

module.exports = router;
