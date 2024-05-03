import express from 'express';
const router = express.Router();
import { bookTickets } from '../../controllers/user/ticketController.js';

router.post('/book-tickets' , bookTickets);
// router.post('/book-tickets' , (res, req) => {
//     return res.status(400).json({ message: "Insufficient data provided" });
// });

export default router;
