const express = require('express');
const router = express.Router();
const slotController = require('../controllers/slotController');

// Route to handle POST requests where the date might be in the body
router.get('/', slotController.getOrCreateSlots);
// Route for compatibility with direct date in URL
router.get('/:date', slotController.getOrCreateSlots);

module.exports = router;
