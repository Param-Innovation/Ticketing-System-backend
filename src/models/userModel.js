import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    googleId: {type: String},
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: false },   // As these data will not be provided by the google
    phone_number: { type: String, required: false },    // As these data will not be provided by the google
    created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User;
