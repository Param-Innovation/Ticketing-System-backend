import mongoose from "mongoose";
// import bcrypt from "bcrypt";
const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  expires: { type: Date, required: true, index: { expires: 10 } }, // Expires after 180 seconds (3 minutes)
});

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
