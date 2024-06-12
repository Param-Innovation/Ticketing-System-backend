import mongoose from "mongoose";

const guestUserSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: false },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const GuestUser = mongoose.model("GuestUser", guestUserSchema);
export default GuestUser;
