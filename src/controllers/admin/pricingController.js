import Pricing from "../../models/pricingModel.js";

// SetPrice Api function
// Param@
// 
export const setPrice = async (req, res) => {
  try {
    const { prices } = req.body;

    // Check if there's existing pricing, update it if exists
    const existingPricing = await Pricing.findOne({});
    if (existingPricing) {
      existingPricing.prices = prices;
      existingPricing.lastUpdated = new Date();
      await existingPricing.save();
      return res
        .status(200)
        .json({
          message: "Pricing updated successfully",
          pricing: existingPricing,
        });
    } else {
      // If no existing pricing, create new
      const newPricing = new Pricing({ prices, lastUpdated: new Date() });
      await newPricing.save();
      return res
        .status(201)
        .json({ message: "Pricing set successfully", pricing: newPricing });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
