import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  discountType: {
    type: String,
    enum: ["percentage", "amount"],
    required: true,
  },
  discountValue: { type: Number, required: true },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  usageLimit: { type: Number, default: 1 }, // Number of times the coupon can be used
  usageCount: { type: Number, default: 0 }, // Number of times the coupon has been used
  minBookingAmount: { type: Number, default: 0 }, // Minimum booking amount to apply coupon
  applicableUserTypes: {
    type: [String],
    enum: ["Registered", "Guest"],
  },
  applicableEventIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Event",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
