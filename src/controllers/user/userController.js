import User from "../../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
// import AWS from "aws-sdk";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import OTP from "../../models/otpModel.js";
import GuestUser from "../../models/guestUserModel.js";

dotenv.config();

// const awsConfig = {
//   accessKeyId: process.env.AWS_SNS_ACCESS_KEY,
//   secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_SNS_REGION,
// };
// AWS.config.update(awsConfig);

const verifyOtp = async (phoneNumber, otp) => {
  try {
    const otpRecord = await OTP.findOne({ phoneNumber });
    if (!otpRecord) {
      return { success: false, message: "No OTP found for this phone number." };
    }

    const isCorrectOtp = await bcrypt.compare(otp, otpRecord.code);
    if (!isCorrectOtp) {
      return { success: false, message: "Incorrect OTP or OTP has expired." };
    }

    return { success: true, message: "OTP verified successfully." };
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return { success: false, message: "Server error", error: error.message };
  }
};

const sns = new SNSClient({
  region: process.env.AWS_SNS_REGION, 
  credentials: {
    accessKeyId: process.env.AWS_SNS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY,
  },
});

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
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token for authentication
    const token = generateToken(user);

    res.status(200).json({
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
    res.status(500).json({ message: "Server error", error: error.message });
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
      return res
        .status(400)
        .json({ message: "User already exists with the provided email" });
    }

    // Check for guest user with the same email (and optionally the same phone number)
    const guestUserConditions = { email };
    // Additional Check ------------------
    // if (phone_number) {
    //   guestUserConditions.phone_number = phone_number; // Include phone number in the search if provided
    // }

    const existingGuestUser = await GuestUser.findOne(guestUserConditions);
    if (existingGuestUser) {
      // Optionally, handle the guest user data before deletion (e.g., migrate data)
      await GuestUser.findByIdAndDelete(existingGuestUser._id);
    }

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

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// SendOTP function...
// @Body Params:
// phoneNumber
export const sendOTP = async (req, res) => {
  const { phoneNumber } = req.body;
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiryDate = new Date(new Date().getTime() + 3 * 60 * 1000); // 3 minutes from now

  // Encrypt the OTP code
  const saltRounds = 10;
  const hashedOtpCode = await bcrypt.hash(otpCode, saltRounds);

  // Sending OTP via AWS SNS
  const params = {
    Message: `Your OTP is: ${otpCode}`, // Message text
    PhoneNumber: phoneNumber,
    MessageAttributes: {
      "AWS.SNS.SMS.SMSType": {
        DataType: "String",
        StringValue: "Transactional",
      },
    },
  };

  const command = new PublishCommand(params);

  try {
    
    
    const publishTextPromise = await sns.send(command);
    
    console.log(publishTextPromise);
    
    const updatedOtp = await OTP.findOneAndUpdate(
      { phoneNumber },
      { code: hashedOtpCode, expires: expiryDate },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res
      .status(200)
      .json({ message: "OTP sent successfully", data: { phoneNumber: updatedOtp.phoneNumber, expires: updatedOtp.expires } });
  } catch (error) {
    console.error("Error in OTP handling:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// Verify guestUser function...
// @Body Params:
// phoneNumber, otp
export const verifyGuestUser = async (req, res) => {
  const { phoneNumber, otp } = req.body;
  const result = await verifyOtp(phoneNumber, otp);
  if (!result.success) {
    return res.status(400).json({ message: result.message });
  }

  // Make changes here regarding the Guest User----------------->
  // If the user is a guest user, generate a token
  if (result.success) {
    const guestUser = await GuestUser.findOne({ phoneNumber });
    const payload = {
      userId: guestUser._id,
      email: guestUser.email,
      role: "guest",
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res.status().json({
      message: "Guest user verified successfully.",
      token: token,
    });
  }

  res
    .status(200)
    .json({
      message:
        "OTP verified successfully but no user found for token generation.",
    });
};
