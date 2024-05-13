import Ticket from "../../models/ticketModel.js";
import User from "../../models/userModel.js";
import GuestUser from "../../models/guestUserModel.js";
import Slot from "../../models/slotModel.js";
import jwt from "jsonwebtoken";
import moment from "moment-timezone";
import Pricing from "../../models/pricingModel.js";

async function calculateTotalAmount(ticketTypes, bookingDate) {
  const pricing = await Pricing.findOne().sort({ lastUpdated: -1 }).limit(1); // Assuming the latest pricing is what we want
  const isWeekend = [0, 6].includes(new Date(bookingDate).getDay()); // 0 = Sunday, 6 = Saturday

  return ticketTypes.reduce((total, ticketType) => {
    const priceDetail = pricing.prices.find((p) => p.type === ticketType.type);
    const price = isWeekend
      ? priceDetail.weekEndPrice
      : priceDetail.weekDayPrice;
    return total + ticketType.numberOfTickets * price;
  }, 0);
}

// BOOK TICKETS FOR REGISTERD OR GUEST USER
export const bookTickets = async (req, res) => {
  const { bookingDate, slotIndex, ticketTypes, name, email, phoneNumber } =
    req.body;
  const token = req.headers.authorization?.split(" ")[1]; // Assumes "Bearer <token>"

  try {
    const now = moment().tz("Asia/Kolkata");
    const bookingMoment = moment.tz(bookingDate, "Asia/Kolkata");

    if (bookingMoment.isBefore(now, "day")) {
      // 'day' checks only date parts, ignoring time
      return res
        .status(400)
        .json({ message: "Cannot book tickets for past dates" });
    }

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

    // Calculate total amount before booking the ticket
    const totalAmount = await calculateTotalAmount(ticketTypes, bookingDate);

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
    if (
      selectedSlot.ticketsAvailable <
      ticketTypes.reduce((sum, type) => sum + type.numberOfTickets, 0)
    ) {
      return res.status(400).json({ message: "Not enough tickets available" });
    }

    // Decrement tickets available
    selectedSlot.ticketsAvailable -= ticketTypes.reduce(
      (sum, type) => sum + type.numberOfTickets,
      0
    );
    // Save the updated slot document
    await slotDocument.save();

    // Create and save the ticket document
    const ticketData = {
      userId: userType === "Registered" ? userEntry._id : undefined,
      guestUserId: userType === "Guest" ? userEntry._id : undefined,
      userType,
      bookingDate,
      timeSlot: selectedSlot.startTime,
      ticketTypes,
      totalAmount,
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

// CANCEL BOOKINGS FOR REGISTERED OR GUEST USER
export const cancelTickets = async (req, res) => {
  const { ticketId } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  try {
    if (!token) {
      return res
        .status(401)
        .json({ message: "No authentication token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Check if the user is authorized to cancel this ticket
    if (
      (ticket.userId && ticket.userId.toString() !== decoded.userId) ||
      (ticket.guestUserId && ticket.guestUserId.toString() !== decoded.userId)
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to cancel this ticket" });
    }

    // Convert booking date from IST to UTC
    const bookingDateUTC = moment(ticket.bookingDate)
      .tz("Asia/Kolkata")
      .startOf("day")
      .utc();

    // Find the corresponding slot document by date
    const slotDocument = await Slot.findOne({
      date: {
        $gte: bookingDateUTC.toDate(),
        $lt: bookingDateUTC.add(1, "days").toDate(),
      },
    });

    // console.log(bookingDateUTC);
    // console.log(ticket.bookingDate);
    // console.log(slotDocument);
    // console.log(
    //   await Slot.findOne({
    //     date: ticket.bookingDate, // Ensuring date format matches
    //   })
    // );

    if (!slotDocument) {
      return res
        .status(404)
        .json({ message: "No slot found for this booking date" });
    }

    // Find the specific slot using the timeSlot from the ticket
    const slotToUpdate = slotDocument.slots.find(
      (slot) => slot.startTime === ticket.timeSlot
    );
    if (!slotToUpdate) {
      return res
        .status(404)
        .json({ message: "No corresponding slot time found" });
    }

    // Update the number of available tickets
    slotToUpdate.ticketsAvailable += ticket.ticketTypes.reduce(
      (acc, curr) => acc + curr.numberOfTickets,
      0
    );
    await slotDocument.save();

    // Proceed to delete the ticket
    await Ticket.findByIdAndDelete(ticketId);
    res.json({ message: "Ticket cancelled successfully, and slot updated" });
  } catch (error) {
    console.error("Error cancelling ticket:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
