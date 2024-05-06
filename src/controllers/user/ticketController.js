import Ticket from "../../models/ticketModel.js";
import User from "../../models/userModel.js";
import GuestUser from "../../models/guestUserModel.js";
import Slot from "../../models/slotModel.js";
import jwt from "jsonwebtoken";
import moment from "moment-timezone";

// BOOK TICKETS FOR REGISTERD OR GUEST USER
export const bookTickets = async (req, res) => {
  const { bookingDate, slotIndex, numberOfTickets, name, email, phoneNumber } =
    req.body;
  const token = req.headers.authorization?.split(" ")[1]; // Assumes "Bearer <token>"

  try {
    // Identify if it's a registered or guest user
    let userEntry, userType;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userEntry = await User.findById(decoded.userId);
      userType = "Registered";
      if (!userEntry) {
        return res.status(404).json({ message: "User not found" });
      }
    } else if (name && email && phoneNumber) {
      // Check for an existing guest user
      userEntry = await GuestUser.findOne({ email: email });
      if (!userEntry) {
        // If no guest user exists, create a new one
        userEntry = new GuestUser({ name, email, phoneNumber });
        await userEntry.save();
      }
      userType = "Guest";
    } else {
      return res.status(400).json({ message: "Insufficient data provided" });
    }

    // Book the ticket and update the slot availability
    const slotDate = moment.tz(bookingDate, "Asia/Kolkata");
    const slotDocument = await Slot.findOne({ date: slotDate });
    // console.log(slotDocument)

    if (!slotDocument) {
      return res
        .status(404)
        .json({ message: "No slots available for this date" });
    }

    if (slotIndex < 0 || slotIndex >= slotDocument.slots.length) {
      return res.status(400).json({ message: "Invalid slot index" });
    }

    // Check ticket availability for the slot
    const selectedSlot = slotDocument.slots[slotIndex];
    if (selectedSlot.ticketsAvailable < numberOfTickets) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    // Decrement tickets available
    selectedSlot.ticketsAvailable -= numberOfTickets;

    // Save the updated slot document
    await slotDocument.save();

    // Create and save the ticket document
    const ticketData = {
      userId: userType === "Registered" ? userEntry._id : undefined,
      guestUserId: userType === "Guest" ? userEntry._id : undefined,
      userType,
      bookingDate,
      timeSlot: selectedSlot.startTime,
      numberOfTickets,
    };

    const newTicket = new Ticket(ticketData);
    await newTicket.save();

    res.status(201).json({
      message: "Ticket booked successfully",
      ticketDetails: newTicket,
      user: userEntry,
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// FETCH BOOKINGS FOR REGISTERD OR GUEST USER
export const getTickets = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const email = req.body.email; // Received from x-www-form-urlencoded

  try {
    if (token) {
      // Decode token to get user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const tickets = await Ticket.find({ userId: user._id });
      if (tickets.length === 0) {
        return res
          .status(404)
          .json({ message: "No tickets found for this user" });
      }
      return res.status(200).json(tickets);
    } else if (email) {
      // Handle guest user
      const guestUser = await GuestUser.findOne({ email });
      if (!guestUser) {
        return res.status(404).json({ message: "Guest user not found" });
      }

      const tickets = await Ticket.find({ guestUserId: guestUser._id });
      if (tickets.length === 0) {
        return res
          .status(404)
          .json({ message: "No tickets found for this guest user" });
      }
      return res.status(200).json(tickets);
    } else {
      return res
        .status(400)
        .json({ message: "No authentication data provided" });
    }
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
