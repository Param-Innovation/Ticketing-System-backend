import express from 'express';
const router = express.Router();
import { sendOTP, signIn, signUp } from '../../controllers/user/userController.js';


router.post("/signin", signIn);
router.post("/signup", signUp);
router.post("/sendOTP", sendOTP);

export default router;
