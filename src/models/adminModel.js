import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: "admin" },
});

// Method to hash password before saving
adminSchema.pre("save", async function (next) {
  if (this.isModified("passwordHash")) {
    const salt = await bcrypt.genSalt(10); // Ensure 'await' is used
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  }
  next();
});

// Method to check password validity
adminSchema.methods.checkPassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

const Admin = mongoose.model("Admin", adminSchema); // Correct 'model' creation
export default Admin;
