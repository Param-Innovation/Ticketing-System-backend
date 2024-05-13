import jwt from "jsonwebtoken";
import Admin from "../models/adminModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if no token is found, return unauthorized

    const secretKey = process.env.JWT_SECRET || 'your-secret-key';

    try {
        const decoded = jwt.verify(token, secretKey);
        console.log(decoded);
        const id = new mongoose.Types.ObjectId(decoded.userId); // Ensure the id is a valid ObjectId
        
        if (decoded.role === 'admin') {
            const admin = await Admin.findById(id);
            if (!admin) return res.sendStatus(403); // Admin not found
            req.user = admin;
            req.user.role = 'admin'; // Ensure the role is clearly set
            next();
        } else if (decoded.role === 'user') {
            const user = await User.findById(id);
            console.log("user not found")
            if (!user) return res.sendStatus(403); // User not found
            req.user = user;
            req.user.role = 'user'; // Ensure the role is clearly set
            next();
        } else {
            return res.sendStatus(403); // Invalid role
        }
    } catch (error) {
        // console.log(error);
        res.status(403).json({message : "Forbidden Error.", error : error.message}); // Token verification failed or other errors
    }
};
