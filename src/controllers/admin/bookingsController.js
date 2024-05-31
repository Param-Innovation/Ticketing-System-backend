import CanceledTicket from "../../models/canceledTicketModel.js";
import Pricing from "../../models/pricingModel.js";
import Slot from "../../models/slotModel.js";
import Ticket from "../../models/ticketModel.js";

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

// Get all ticket bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Ticket.find()
      .populate("userId", "username email")
      .populate("guestUserId", "name email");
    res.status(200).json(bookings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to retrieve bookings", error: error.message });
  }
};

// Edit Specific booking
export const editBooking = async (req, res) => {
  const { id } = req.params;
  const { bookingDate, timeSlot, ticketTypes } = req.body;

  try {
    const booking = await Ticket.findById(id);
    if (!booking) {
      return res
        .status(404)
        .json({ message: "Booking Not Found/Invalid Ticket Id" });
    }
    const newTotalAmount = await calculateTotalAmount(ticketTypes, bookingDate);

    // Check if additional payment is required or refund is needed
    if (newTotalAmount > booking.totalAmount) {
      // Process additional payment (pseudo-code, adjust to actual payment logic)
      // await processAdditionalPayment(newTotalAmount - booking.totalAmount);
    } else if (newTotalAmount < booking.totalAmount) {
      // Process refund (pseudo-code, adjust to actual refund logic)
      // await processRefund(booking.totalAmount - newTotalAmount);
    }

    // Update the booking details
    booking.bookingDate = bookingDate || booking.bookingDate;
    booking.timeSlot = timeSlot || booking.timeSlot;
    booking.ticketTypes = ticketTypes || booking.ticketTypes;
    booking.totalAmount = newTotalAmount;
    booking.modifiedDate = new Date();

    await booking.save();
    res.status(200).json({ message: "Booking updated successfully", booking });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update booking", error: error.message });
  }
};

export const cancelBookings = async (req, res) => {
  let { ticketIds } = req.body;
  
  //Ensure if ticketIds is an array
  if (!Array.isArray(ticketIds)) {
    ticketIds = [ticketIds];
  }

  try {
    const tickets = await Ticket.find({ _id: { $in: ticketIds } });
    if (tickets.length === 0) {
      return res
        .status(404)
        .json({ message: "Bookings not found / Invalid ticket Ids" });
    }

    const slotUpdates = {};
    for (const ticket of tickets) {
      // Process refund (pseudo-code, adjust to actual refund logic)
      // await processRefund(ticket.totalAmount);

      // Accumulate slot updates
      const slotDate = ticket.bookingDate.toISOString().split("T")[0]; // Normalize date to YYYY-MM-DD format
      if (!slotUpdates[slotDate]) {
        slotUpdates[slotDate] = {};
      }

      const slotToUpdate = slotUpdates[slotDate][ticket.timeSlot] || 0;
      slotUpdates[slotDate][ticket.timeSlot] =
        slotToUpdate +
        ticket.ticketTypes.reduce((acc, curr) => acc + curr.numberOfTickets, 0);

      // Notify user about cancellation
      // await notifyUser(ticket);

      // Add the canceled ticket to the CanceledTicket collection
      const canceledTicket = new CanceledTicket({
        ticketId: ticket._id,
        userId: ticket.userId || ticket.guestUserId,
        userType: ticket.userType,
        bookingDate: ticket.bookingDate,
        totalAmountRefunded: ticket.totalAmount,
        ticketDetails: ticket.ticketTypes,
      });
      await canceledTicket.save();

      // Remove the ticket
      await Ticket.findByIdAndDelete(ticket._id);
    }
    // Apply slot updates in bulk
    for (const [date, slots] of Object.entries(slotUpdates)) {
      const slotDocument = await Slot.findOne({ date: new Date(date) });
      if (slotDocument) {
        for (const [timeSlot, increment] of Object.entries(slots)) {
          const slot = slotDocument.slots.find((s) => s.startTime === timeSlot);
          if (slot) {
            slot.ticketsAvailable += increment;
          }
        }
        await slotDocument.save();
      }
    }

    res
      .status(200)
      .json({ message: "Tickets canceled successfully and refunds processed" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to perform mass cancellation",
      error: error.message,
    });
  }
};
