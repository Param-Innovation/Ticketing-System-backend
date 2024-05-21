import Ticket from "../../models/ticketModel.js";

// Get all ticket bookings
export const getAllBookings = async (req, res) => {
    try {
      const bookings = await Ticket.find().populate('userId', 'username email').populate('guestUserId', 'name email');
      res.status(200).json(bookings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to retrieve bookings', error: error.message });
    }
  };