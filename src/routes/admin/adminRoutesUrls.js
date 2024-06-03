import express from 'express';
import { setPrice } from '../../controllers/admin/pricingController.js';
import { adminLogin } from '../../controllers/admin/adminController.js'; // createAdmin can be added if new admin needs to be added
import { authenticateToken } from '../../middleware/authenticate.js';
import { getUserByType } from '../../controllers/admin/userListController.js';
import { cancelBookings, editBooking, getAllBookings } from '../../controllers/admin/bookingsController.js';
import { addEvent, editEvent, listEvents, removeEvent } from '../../controllers/admin/eventController.js';
import { addCoupon, editCoupon, listCoupons, removeCoupon } from '../../controllers/admin/couponController.js';
import { ReturnDocument } from 'mongodb';

const router = express.Router();

// router.post('/create-admin', createAdmin)    // Un-Comment if need to create admin user

router.post('/admin-login', adminLogin)
// Endpoint to set pricing for different ticket types
router.post('/set-price', authenticateToken, setPrice);
// Endpoint for listing the user(s)
router.get('/users', authenticateToken, getUserByType);
// Endpoint for listing the Booking(s) / Ticket(s)
router.get('/bookings', authenticateToken, getAllBookings);
// Endpoint for cancelling Booking(s) / Ticket(s)
router.put('/bookings/cancel', authenticateToken, cancelBookings);
// Endpoint for Editing a particular Booking / Ticket
router.put('/bookings/:id', authenticateToken, editBooking);
// Endpoint to get all events
router.get('/events', authenticateToken, listEvents);
// Endpoint to Add a new event
router.post('/events', authenticateToken, addEvent);
// Endpoint to Edit an existing event
router.put('/events/:id', authenticateToken, editEvent);
// Endpoint to Remove an event
router.delete('/events/:id', authenticateToken, removeEvent);
// List all coupons
router.get('/coupon', authenticateToken, listCoupons);
// List a particular coupon
router.get('/coupon/:couponId', authenticateToken, listCoupons);
// Add a new coupon
router.post('/coupon', authenticateToken, addCoupon);
// Edit a new coupon
router.put('/coupon/:couponId', authenticateToken, editCoupon);
// Delete a new coupon
router.delete('/coupon/:couponId', authenticateToken, removeCoupon);


export default router;
