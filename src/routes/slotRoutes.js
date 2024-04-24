const express = require('express');
const router = express.Router();
const slotController = require('../controller/slotController');

router.get('/:date', slotController.getOrCreateSlots);

module.exports = router;
