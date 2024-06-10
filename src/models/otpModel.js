import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  contactMethod: {
    type: String,
    required: true,
    enum: ["email", "phoneNumber"], // Defines the method of OTP delivery
  },
  contactValue: {
    type: String,
    required: true,
    unique: true, // Ensures that each email or phone number is unique in the collection
    index: true, // Improves the performance of query operations that specify this field
  },
  code: {
    type: String,
    required: true,
  },
  expires: {
    type: Date,
    required: true,
    index: { expires: "3m" }, // Automatically delete documents after 3 minutes
  },
});

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
