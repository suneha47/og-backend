const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const protect = require("../middleware/authMiddleware");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "og47-products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"), false);
  },
});

// GET /products — public
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Error fetching products", error: err.message });
  }
});

// GET /products/:id — public
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Error fetching product", error: err.message });
  }
});

// POST /products — admin only
router.post("/", protect, upload.single("image"), async (req, res) => {
  try {
    const { name, price, category, description } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ message: "Name, price and category are required" });
    }
    const imageUrl = req.file ? req.file.path : req.body.image || "";
    const imagePublicId = req.file ? req.file.filename : "";
    const product = await Product.create({
      name,
      price: parseFloat(price),
      category,
      description,
      image: imageUrl,
      imagePublicId,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Error adding product", error: err.message });
  }
});

// PUT /products/:id — admin only
router.put("/:id", protect, upload.single("image"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, price, category, description } = req.body;
    if (name) product.name = name;
    if (price) product.price = parseFloat(price);
    if (category) product.category = category;
    if (description) product.description = description;

    // If new image uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      if (product.imagePublicId) {
        await cloudinary.uploader.destroy(product.imagePublicId);
      }
      product.image = req.file.path;
      product.imagePublicId = req.file.filename;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Error updating product", error: err.message });
  }
});

// DELETE /products/:id — admin only
router.delete("/:id", protect, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Delete image from Cloudinary
    if (product.imagePublicId) {
      await cloudinary.uploader.destroy(product.imagePublicId);
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product", error: err.message });
  }
});

module.exports = router;
