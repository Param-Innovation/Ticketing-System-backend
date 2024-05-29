import express from 'express';
const router = express.Router();
import { bookTickets, calculateTotal, cancelTickets, getTickets } from '../../controllers/user/ticketController.js';

router.post('/calculate-total' , calculateTotal);
router.post('/book-tickets' , bookTickets);
router.get('/bookings', getTickets);
router.delete('/cancel', cancelTickets);

export default router;
