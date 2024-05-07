import express from 'express';
import { setPrice } from '../../controllers/admin/pricingController.js';
import { adminLogin } from '../../controllers/admin/adminController.js'; // createAdmin can be added if new admin needs to be added
import { authenticateToken } from '../../middleware/authenticate.js';

const router = express.Router();

// router.post('/create-admin', createAdmin)    // Un-Comment if need to create admin user

router.post('/admin-login', adminLogin)
// Endpoint to set pricing for different ticket types
router.post('/set-price', authenticateToken, setPrice);


export default router;
