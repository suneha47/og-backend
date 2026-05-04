const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Product name is required"],
    trim: true,
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    min: 0,
  },
  category: {
    type: String,
    required: [true, "Category is required"],
    enum: ["Wallets","Side Bags","Watches","Perfumes","Sunglasses","T-Shirts","Pants","Shirts","Caps"],
  },
  description: {
    type: String,
    default: "",
  },
  image: {
    type: String,
    default: "",
  },
  imagePublicId: {
    type: String,
    default: "",
  },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
