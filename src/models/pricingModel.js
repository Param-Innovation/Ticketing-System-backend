const mongoose = require("mongoose");

const pricingSchema = new mongoose.Schema({
  weekDayPrice: { type: Number, required: true },
  weekEndPrice: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now() },
});

const Pricing = mongoose.model("Pricing", pricingSchema);

module.exports = Pricing;
