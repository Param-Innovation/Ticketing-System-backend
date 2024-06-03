import Coupon from "../../models/couponModel.js";

// List all events
export const listCoupons = async (req, res) => {
  const { couponId } = req.params;
  try {
    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      console.log(coupon)
      if (!coupon) {
        return res.status(404).json({ message: "Coupon not found" });
      }
      return res.status(200).json(coupon);
    } else {
      const coupons = await Coupon.find();
      return res.status(200).json(coupons);
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

// Add a new coupon
// @Body params
// {
//     "code": "SAVE20",
//     "discountType": "percentage",
//     "discountValue": 20,
//     "validFrom": "2024-06-01",
//     "validTo": "2024-06-30",
//     "usageLimit": 100,
//     "minBookingAmount": 50,
//     "applicableUserTypes": ["Registered", "Guest"],
//     "applicableEventIds": ["eventId1", "eventId2"]
// }
export const addCoupon = async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    validFrom,
    validTo,
    usageLimit,
    minBookingAmount,
    applicableUserTypes,
    applicableEventIds,
  } = req.body;

  try {
    const newCoupon = new Coupon({
      code,
      discountType,
      discountValue,
      validFrom,
      validTo,
      usageLimit,
      minBookingAmount,
      applicableUserTypes,
      applicableEventIds,
    });

    await newCoupon.save();

    res
      .status(201)
      .json({ message: "Coupon added successfully", coupon: newCoupon });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to add coupon", error: error.message });
  }
};

// Edit an existing coupon
// @Params
// couponId and parameters to be changed
export const editCoupon = async (req, res) => {
  const { couponId } = req.params;
  const {
    code,
    discountType,
    discountValue,
    validFrom,
    validTo,
    usageLimit,
    minBookingAmount,
    applicableUserTypes,
    applicableEventIds,
  } = req.body;

  try {
    const coupon = await Coupon.findById(couponId);
    console.log("==========", coupon);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    coupon.code = code || coupon.code;
    coupon.discountType = discountType || coupon.discountType;
    coupon.discountValue = discountValue || coupon.discountValue;
    coupon.validFrom = validFrom || coupon.validFrom;
    coupon.validTo = validTo || coupon.validTo;
    coupon.usageLimit = usageLimit || coupon.usageLimit;
    coupon.minBookingAmount = minBookingAmount || coupon.minBookingAmount;
    coupon.applicableUserTypes =
      applicableUserTypes || coupon.applicableUserTypes;
    coupon.applicableEventIds = applicableEventIds || coupon.applicableEventIds;
    coupon.updatedAt = new Date();

    await coupon.save();

    res.status(200).json({ message: "Coupon updated successfully", coupon });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update coupon", error: error.message });
  }
};

// Remove a coupon
// @Params
// couponId
export const removeCoupon = async (req, res) => {
  const { couponId } = req.params;
  //   console.log(couponId)

  try {
    const coupon = await Coupon.findByIdAndDelete(couponId);
    // console.log(coupon)
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.status(200).json({ message: "Coupon removed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to remove coupon", error: error.message });
  }
};
