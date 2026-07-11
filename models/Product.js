const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name:         { type: String, required: [true, "Product name is required"], trim: true },
  price:        { type: Number, required: [true, "Price is required"], min: 0 },
  mrp:          { type: Number, default: null },
  category:     { type: String, required: [true, "Category is required"] },
  description:  { type: String, default: "" },
  image:        { type: String, default: "" },
  images:       [{ type: String }],
  stock:        { type: Number, default: -1 },   // -1 = unlimited
  sizes:        [{ type: String }],               // ['S','M','L','XL']
  colors:       [{ type: String }],               // ['Red','Blue','Black']
  imagePublicId:{ type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
