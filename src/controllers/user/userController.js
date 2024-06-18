import User from "../../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { transporter } from "../../config/config.js";
import OTP from "../../models/otpModel.js";
import GuestUser from "../../models/guestUserModel.js";
import CanceledTicket from "../../models/canceledTicketModel.js";
import Ticket from "../../models/ticketModel.js";

dotenv.config();

const verifyOtp = async (contactMethod, contactValue, otp) => {
  try {
    const otpRecord = await OTP.findOne({
      contactMethod: contactMethod,
      contactValue: contactValue,
    });
    if (!otpRecord) {
      return {
        success: false,
        message: `No OTP found for this ${contactMethod}.`,
      };
    }

    const isCorrectOtp = await bcrypt.compare(otp, otpRecord.code);
    if (!isCorrectOtp) {
      return {
        success: false,
        message: `Incorrect OTP or OTP has expired for ${contactMethod}.`,
      };
    }

    return {
      success: true,
      message: `OTP verified successfully for ${contactMethod}.`,
    };
  } catch (error) {
    console.error(`Error verifying OTP for ${contactMethod}:`, error);
    return { success: false, message: "Server error", error: error.message };
  }
};

function generateToken(user) {
  const payload = {
    userId: user._id,
    email: user.email,
    role: "user",
  };
  const secretKey = process.env.JWT_SECRET || "test-secret-key";
  const options = { expiresIn: "2h" }; // Token expires in 2 hours
  return jwt.sign(payload, secretKey, options);
}

// SignIn function...
// @Body params:
// email, password
export const signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token for authentication
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: "User signed in successfully",
      user: {
        userId: user._id,
        username: user.username,
        email: user.email,
        phone_number: user.phone_number,
      },
      token: token,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// SignUp function...
// @Body Params:
// usernmae, email, password, phone_number
export const signUp = async (req, res) => {
  const { username, email, password, phone_number } = req.body;
  // console.log(req.body)

  // res.send('SignUp API')
  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with the provided email",
      });
    }

    // Check for guest user with the same email (and optionally the same phone number)
    const existingGuestUser = await GuestUser.findOne({ email });

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create a new user
    const user = new User({
      username,
      email,
      password_hash: hashedPassword,
      phone_number,
      created_at: new Date(),
    });

    // Save the user in the database
    await user.save();
    let transferredTickets;
    if (existingGuestUser) {
      console.log("It's a guest user---------")
      // Optionally, handle the guest user data before deletion (e.g., migrate data)
      console.log("Trying to transfer tickets---------")
      transferredTickets = await Ticket.updateMany(
        { guestUserId: existingGuestUser._id },
        {
          $set: { userId: user._id, userType: "Registered", guestUserId: null },
        }
      );
      console.log("Ticket transfer result :", transferredTickets)
      
      // Update canceled tickets
      const canceledTickets = await CanceledTicket.updateMany(
        { userId: existingGuestUser._id, userType: "Guest" },
        { $set: { userId: user._id, userType: "Registered" } }
      );
      console.log("Canceled Ticket transfer result :", canceledTickets)

      // Optionally, handle the guest user data before deletion (e.g., migrate data)
      await GuestUser.findByIdAndDelete(existingGuestUser._id);
    }

    res.status(201).json({
      success: true,
      message: `User registered successfully. ${transferredTickets}? 'Tickets transferred successfully':'Ticket transferred failed'`,
      userId: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// SendOTP function...
// @Body Params:
// phoneNumber
export const sendOTP = async (req, res) => {
  const { email } = req.body;

  // Validate that email is provided
  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required for OTP.",
    });
  }

  const otpCodeForEmail = Math.floor(
    100000 + Math.random() * 900000
  ).toString();
  const expiryDateForEmail = new Date(new Date().getTime() + 3 * 60 * 1000); // OTP expires in 3 minutes

  try {
    // Encrypt the OTP code
    const hashedOtpCodeForEmail = await bcrypt.hash(otpCodeForEmail, 10);

    // Prepare to send OTP via Email
    const mailOptions = {
      from: process.env.GMAIL_EMAIL_ID,
      to: email,
      subject: "Email Verification",
      html: `<p>Your OTP for Email Verification: ${otpCodeForEmail}</p>`,
    };

    // Send OTP via Email
    const emailResponse = await transporter.sendMail(mailOptions);

    // Update the OTP for the email in the database
    const updatedOtpEmail = await OTP.findOneAndUpdate(
      {
        contactMethod: "email",
        contactValue: email,
      },
      {
        code: hashedOtpCodeForEmail,
        expires: expiryDateForEmail,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Send success response
    res.status(200).json({
      success: true,
      message: "OTP sent successfully via email.",
      data: {
        email: email,
        emailExpires: updatedOtpEmail.expires,
      },
    });
  } catch (error) {
    console.error("Error in sending OTP via email:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP via email.",
      error: error.message,
    });
  }
};

// Verify guestUser function...
// @Body Params:
// phoneNumber, otp
export const verifyGuestUser = async (req, res) => {
  const { email, otpEmail, isRegistering = false } = req.body;
  // const { phoneNumber, otpPhone } = req.body;

  // Verify the email OTP only
  const emailResult = await verifyOtp("email", email, otpEmail);

  if (!emailResult.success) {
    return res
      .status(400)
      .json({ success: false, message: emailResult.message });
  }

  if (isRegistering) {
    // If in registration process, just return success without creating a guest user
    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
    });
  } else {
    // Find or create the guest user based on email verification
    let userEntry = await GuestUser.findOne({ email: email });

    if (!userEntry) {
      // Create a new guest user if one does not exist with the verified email
      const newUser = new GuestUser({
        name: email.substring(0, email.indexOf("@")),
        email: email,
      });
      await newUser.save();
      return res.status(201).json({
        success: true,
        message: "Guest user created successfully with verified email.",
        details: newUser,
      });
    } else {
      // If user already exists, just confirm the email verification
      return res.status(200).json({
        success: true,
        message: "Email already verified for existing guest user.",
        details: userEntry,
      });
    }
  }
};
