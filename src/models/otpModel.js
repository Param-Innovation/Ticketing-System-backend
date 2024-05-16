import mongoose from "mongoose";
import bcrypt from "bcrypt";
const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  expires: { type: Date, required: true, index: { expires: 0 } }, // Expires after 180 seconds (3 minutes)
});

// Encrypt OTP before saving
otpSchema.pre("save", async function (next) {
  if (this.isModified("code")) {
    const saltRounds = 10;
    this.code = await bcrypt.hash(this.code, saltRounds);
  }
  next();
});

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;
