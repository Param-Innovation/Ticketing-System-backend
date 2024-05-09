import express from 'express';
const router = express.Router();
import { bookTickets, getTicketsByUser } from '../../controllers/user/ticketController.js';

router.get('/' , getTicketsByUser);
router.post('/book-tickets' , bookTickets);
// router.post('/book-tickets' , (res, req) => {
//     return res.status(400).json({ message: "Insufficient data provided" });
// });

export default router;
