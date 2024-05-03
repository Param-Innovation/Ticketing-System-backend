import express from 'express';
const router = express.Router();
import { getOrCreateSlots } from '../../controllers/user/slotController.js'

// Route to handle POST requests where the date might be in the body
router.get('/', getOrCreateSlots);
// Route for compatibility with direct date in URL
router.get('/:date', getOrCreateSlots);

export default router;
