import express from 'express';
const router = express.Router();
import { bookTickets, getTickets } from '../../controllers/user/ticketController.js';

router.post('/book-tickets' , bookTickets);
router.get('/bookings', getTickets);

export default router;
