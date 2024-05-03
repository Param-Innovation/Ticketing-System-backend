import mongoose from "mongoose";

const guestUserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
})

const GuestUser = mongoose.model('GuestUser', guestUserSchema);
export default GuestUser;