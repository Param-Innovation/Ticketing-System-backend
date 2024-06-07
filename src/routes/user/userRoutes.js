import express from 'express';
const router = express.Router();
import { sendOTP, signIn, signUp, verifyGuestUser } from '../../controllers/user/userController.js';


router.post("/signin", signIn);
router.post("/signup", signUp);
router.post("/sendOTP", sendOTP);
router.post("/verifyContacts", verifyGuestUser);

export default router;
