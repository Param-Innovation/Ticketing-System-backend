const mongoose = require("mongoose");

const priceDetailSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["adult", "child", "student", "senior"],
    required: true,
  },
  weekDayPrice: { type: Number, required: true },
  weekEndPrice: { type: Number, required: true },
});

const pricingSchema = new mongoose.Schema({
  prices: [priceDetailSchema],
  lastUpdated: { type: Date, default: Date.now },
});

const Pricing = mongoose.model("Pricing", pricingSchema);

module.exports = Pricing;
