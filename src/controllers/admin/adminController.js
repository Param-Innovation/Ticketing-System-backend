import jwt from "jsonwebtoken";
import Admin from "../../models/adminModel.js";


function generateToken(admin) {
  const payload = {
      userId: admin._id,
      email: admin.email,
      role : 'admin'
  };
  const secretKey = process.env.JWT_SECRET || 'test-secret-key';
  const options = { expiresIn: '1h' }; // Token expires in 2 hours
  return jwt.sign(payload, secretKey, options);
}
// One-Time function for creating admin
// Params@
// username, password, email
// export const createAdmin = async (req, res) => {
//   const { username, password, email } = req.body;

//   try {
//     // Check if the admin already exists
//     let admin = await Admin.findOne({ email });
//     if (admin) {
//       // If admin exists, update their password or other details
//       admin.passwordHash = password; // This will trigger the pre-save middleware for hashing
//     } else {
//       // If no admin exists, create a new one
//       admin = new Admin({
//         username,
//         email,
//         passwordHash: password, // Directly setting passwordHash, middleware will hash it
//       });
//     }
//     await admin.save();
//     // Save or update the admin, triggering the pre-save middleware
//     res.status(201).json({
//       message: "Admin created/updated successfully",
//       admin: {
//         id: admin._id,
//         username: admin.username,
//         email: admin.email,
//       },
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Failed to create/update admin", error: error.message });
//   }
// };


// Admin Login Function
// Params@
// username, password
export const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res
        .status(401)
        .json({ message: "Authentication failed. Admin not found." });
    }

    const isMatch = await admin.checkPassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Authentication failed. Wrong password." });
    }

    // Generate JWT Token
    const token = generateToken(admin);

    res.status(200).json({
      message: "Admin authenticated successfully",
      token: token,
    });
  } catch (error) {
    res.status(500).json({
      message: "Server error during admin authentication",
      error: error.message,
    });
  }
};

