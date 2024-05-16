import User from "../../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import AWS from "aws-sdk";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import OTP from "../../models/otpModel.js";

dotenv.config();

// const awsConfig = {
//   accessKeyId: process.env.AWS_SNS_ACCESS_KEY,
//   secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_SNS_REGION,
// };
// AWS.config.update(awsConfig);

const sns = new SNSClient({
    region : process.env.AWS_SNS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_SNS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SNS_SECRET_ACCESS_KEY
    }
})

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

  try {
    const updatedOtp = await OTP.findOneAndUpdate(
      { phoneNumber },
      { code: otpCode, expires: expiryDate },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

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

    const command = new PublishCommand(params)

    const publishTextPromise = await sns.send(command);

    publishTextPromise
      .then(function (data) {
        console.log("Success Data:", data);
        res.json({ MessageID: data.MessageId, OTP: otpCode }); // Simplified response handling
      })
      .catch(function (err) {
        console.error("Error sending SMS:", err);
        // Extract useful information from the error object
        const errorResponse = {
          message: err.message, // Generally safe to expose
          code: err.code, // AWS error code if available
          statusCode: err.statusCode, // HTTP status code from AWS response if available
          retryable: err.retryable, // Indicates if the request can be retried
        };
        res.status(500).json({ Error: errorResponse });
      });

    // console.log(publishTextPromise);

    // res
    //   .status(200)
    //   .json({ message: "OTP sent successfully", data: updatedOtp });
  } catch (error) {
    console.error("Error in OTP handling:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
};
