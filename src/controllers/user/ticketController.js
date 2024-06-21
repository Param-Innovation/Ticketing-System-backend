import Ticket from "../../models/ticketModel.js";
import User from "../../models/userModel.js";
import GuestUser from "../../models/guestUserModel.js";
import Slot from "../../models/slotModel.js";
import jwt from "jsonwebtoken";
import moment from "moment-timezone";
import Pricing from "../../models/pricingModel.js";
import CanceledTicket from "../../models/canceledTicketModel.js";
import crypto from "crypto";
import Payment from "../../models/paymentModel.js";
import { initiateRefund } from "../razorpay/razorpayController.js";
import { transporter } from "../../config/config.js";

async function calculateTotalAmount(
  ticketTypes,
  bookingDate,
  specialEventId = null
) {
  const pricing = await Pricing.findOne().sort({ lastUpdated: -1 }).limit(1); // Assuming the latest pricing is what we want
  const isWeekend = [0, 6].includes(new Date(bookingDate).getDay()); // 0 = Sunday, 6 = Saturday

  let totalAmount = ticketTypes.reduce((total, ticketType) => {
    const priceDetail = pricing.prices.find((p) => p.type === ticketType.type);
    const price = isWeekend
      ? priceDetail.weekEndPrice
      : priceDetail.weekDayPrice;
    return total + ticketType.numberOfTickets * price;
  }, 0);

  // Add special event price if applicable
  if (specialEventId) {
    const event = await Event.findById(specialEventId);
    if (event) {
      const isEventWeekend = [0, 6].includes(
        new Date(event.startDate).getDay()
      );
      const eventPrices = event.prices;
      totalAmount += eventPrices.reduce((total, ticketType) => {
        const price = isEventWeekend
          ? ticketType.weekEndPrice
          : ticketType.weekDayPrice;
        return total + price;
      }, 0);
    }
  }

  return totalAmount;
}

async function checkSameDayEvent(bookingDate, specialEventId) {
  const event = await Event.findById(specialEventId);
  if (!event) {
    return false;
  }
  const eventStartDate = moment(event.startDate).startOf("day");
  const bookingMoment = moment(bookingDate).startOf("day");
  return eventStartDate.isSame(bookingMoment);
}

// CALCULATE TOTAL AMOUNT FOR THE TICKET
export const calculateTotal = async (req, res) => {
  const { bookingDate, ticketTypes, specialEventId, couponCode } = req.body;
  const token = req.headers.authorization?.split(" ")[1];
  const { email } = req.body;

  try {
    const now = moment().tz("Asia/Kolkata");
    const bookingMoment = moment.tz(bookingDate, "Asia/Kolkata");

    if (bookingMoment.isBefore(now, "day")) {
      return res.status(400).json({
        message: `Cannot book tickets for past dates , ${now} > ${bookingDate}`,
      });
    }

    let userEntry, userType;
    let couponValidForUser = false;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userEntry = await User.findById(decoded.userId);
      userType = "Registered";
      if (!userEntry) {
        return res.status(404).json({ message: "User not found" });
      }
      couponValidForUser = true;
    } else if (email) {
      userEntry = await User.findOne({ email: email });
      if (userEntry) {
        return res.status(409).json({
          success: false,
          message:
            "Email belongs to a registered user, Please login before proceeding",
        });
      } else if (!userEntry) {
        userEntry = await GuestUser.findOne({ email: email });
        userType = "Guest";
        if (!userEntry) {
          const atIndex = email.indexOf("@");
          const name = email.slice(0, atIndex);
          console.log(name);
          userEntry = new GuestUser({ name, email });
          await userEntry.save();
        }
        couponValidForUser = true;
      }
    }

    let totalAmount = await calculateTotalAmount(
      ticketTypes,
      bookingDate,
      specialEventId
    );

    // Apply coupon if provided
    let appliedCoupon;
    if (couponCode) {
      appliedCoupon = await Coupon.findOne({ code: couponCode }).populate(
        "applicableEventIds"
      );
      if (!appliedCoupon) {
        return res.status(400).json({ message: "Invalid coupon code" });
      }

      const currentDate = new Date();
      if (
        currentDate < appliedCoupon.validFrom ||
        currentDate > appliedCoupon.validTo
      ) {
        return res
          .status(400)
          .json({ message: "Coupon is not valid for the current date" });
      }

      if (
        appliedCoupon.applicableUserTypes.length > 0 &&
        !appliedCoupon.applicableUserTypes.includes(userType)
      ) {
        return res
          .status(400)
          .json({ message: "Coupon is not applicable for this user type" });
      }

      if (
        appliedCoupon.applicableEventIds.length > 0 &&
        specialEventId &&
        !appliedCoupon.applicableEventIds.some(
          (event) => event._id.toString() === specialEventId
        )
      ) {
        return res
          .status(400)
          .json({ message: "Coupon is not applicable for this event" });
      }

      if (totalAmount < appliedCoupon.minBookingAmount) {
        return res.status(400).json({
          message:
            "Booking amount is less than the minimum required for this coupon",
        });
      }

      if (couponValidForUser) {
        const userId = userEntry._id;

        const userCouponUsage = await Ticket.countDocuments({
          $or: [{ userId }, { guestUserId: userId }],
          couponCode: couponCode,
        });

        if (userCouponUsage >= appliedCoupon.usageLimit) {
          return res
            .status(400)
            .json({ message: "Coupon usage limit exceeded for this user" });
        }
      }

      const isSameDayEvent = specialEventId
        ? await checkSameDayEvent(bookingDate, specialEventId)
        : true;
      if (!isSameDayEvent) {
        return res.status(400).json({
          message:
            "Coupon is not applicable as the event and slot are not on the same day",
        });
      }

      let discountAmount = 0;
      if (appliedCoupon.discountType === "percentage") {
        discountAmount = (totalAmount * appliedCoupon.discountValue) / 100;
      } else {
        discountAmount = appliedCoupon.discountValue;
      }

      totalAmount -= discountAmount;
    }

    res.status(200).json({ success: true, totalAmount, appliedCoupon });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// BOOK TICKETS FOR REGISTERD OR GUEST USER
export const bookTickets = async (req, res) => {
  const {
    bookingDateRaw,
    slotIndex,
    ticketTypes,
    email,
    paymentId,
    orderId,
    signature,
  } = req.body;
  const token = req.headers.authorization?.split(" ")[1]; // Assumes "Bearer <token>"

  try {
    const now = moment().tz("Asia/Kolkata");
    const bookingMoment = moment.tz(bookingDateRaw, "Asia/Kolkata");

    if (bookingMoment.isBefore(now, "day")) {
      // 'day' checks only date parts, ignoring time
      return res.status(400).json({
        message: `Cannot book tickets for past dates , ${now} > ${bookingMoment}`,
      });
    }

    console.log(
      "payemntId :",
      paymentId,
      ", orderId :",
      orderId,
      ", signature :",
      signature
    );

    // Verify payment signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RZP_KEY_SECRET)
      .update(orderId + "|" + paymentId)
      .digest("hex");
    console.log("expectedSignature :", expectedSignature);

    if (signature !== expectedSignature) {
      return res.status(400).json({ message: "Payment verification failed" });
    }

    // Confirm payment and book the ticket
    const payment = await Payment.findOne({ orderId });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    payment.paymentId = paymentId;
    payment.status = "paid"; // Update status to 'paid' or 'verified'

    // Identify if it's a registered or guest user
    let userEntry, userType;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userEntry = await User.findById(decoded.userId);
      userType = "Registered";
      if (!userEntry) {
        return res.status(404).json({ message: "User not found" });
      }
    } else if (email) {
      // Check for an existing guest user
      userEntry = await GuestUser.findOne({ email: email });
      if (!userEntry) {
        // If no guest user exists, create a new one
        const atIndex = email.indexOf("@");
        const name = email.slice(0, atIndex);
        userEntry = new GuestUser({ name, email });
        await userEntry.save();
      }
      userType = "Guest";
    } else {
      return res.status(400).json({ message: "Insufficient data provided" });
    }

    // Calculate total amount before booking the ticket
    const totalAmount = await calculateTotalAmount(ticketTypes, bookingDateRaw);

    // Book the ticket and update the slot availability
    const slotDate = moment.tz(bookingDateRaw, "Asia/Kolkata");
    const slotDocument = await Slot.findOne({ date: slotDate });
    console.log(slotDocument);

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
      return res
        .status(400)
        .json({ success: false, message: "Not enough tickets available" });
    }

    // return res.json({ Message: "Testing" });
    // Decrement tickets available
    selectedSlot.ticketsAvailable -= ticketTypes.reduce(
      (sum, type) => sum + type.numberOfTickets,
      0
    );
    // Save the updated slot document
    await slotDocument.save();

    // Converting the
    const bookingDate = moment.tz(
      `${bookingDateRaw}T${selectedSlot.startTime}`,
      "Asia/Kolkata"
    );
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

    // Update payment with the ticketId
    payment.ticketId = newTicket._id;
    await payment.save();

    // Send an email to the guest user if it's a guest user booking

    const mailOptions = {
      from: process.env.EMAIL_FROM_ADDRESS,
      to: userEntry.email,
      subject: "Your Ticket Booking Confirmation",
      html: `<h1>Ticket Booking Successful</h1>
           <p>Your tickets have been successfully booked.</p>
           <p>You can manage your booking at ${
             userType === "Registered"
               ? "Manange Bookings in your account"
               : ': <a href="${process.env.FRONTEND_URL}/manageBookings/${userEntry._id}">Manage Booking</a>'
           }</p>`,
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log("Email could not be sent: " + error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });

    res.status(201).json({
      success: true,
      message: "Ticket booked successfully",
      ticketDetails: newTicket,
      user: userEntry,
    });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// FETCH BOOKINGS FOR REGISTERD OR GUEST USER
export const getTickets = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const guestUserId = req.params.userId; // Received from x-www-form-urlencoded

  try {
    if (token) {
      // Decode token to get user info
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        console.log("user not found");
        return res.status(404).json({ message: "User not found" });
      }

      const tickets = await Ticket.find({ userId: user._id });
      if (tickets.length === 0) {
        console.log("ticket not found");
        return res
          .status(404)
          .json({ message: "No tickets found for this user" });
      }
      console.log("ticket found");
      return res.status(200).json(tickets);
    } else if (guestUserId) {
      // Handle guest user
      const guestUser = await GuestUser.findById(guestUserId);
      if (!guestUser) {
        return res.status(404).json({ message: "Guest user not found" });
      }

      const tickets = await Ticket.find({ guestUserId: guestUserId });
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
  const { ticketId, userId } = req.body;
  const token = req.headers.authorization?.split(" ")[1];

  try {
    let decodedUserId = null;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      decodedUserId = decoded.userId;
    } else if (userId) {
      const user = GuestUser.findById(userId);
      if (user) {
        decodedUserId = userId;
      } else {
        return res
          .status(404)
          .json({ success: false, message: "User Not Found" });
      }
    } else {
      return res
        .status(401)
        .json({ success: false, message: "No authentication data provided" });
    }
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Ticket not found" });
    }

    console.log(ticket);

    // Check if the user is authorized to cancel this ticket
    if (
      (ticket.userId && ticket.userId.toString() !== decodedUserId) ||
      (ticket.guestUserId && ticket.guestUserId.toString() !== decodedUserId)
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this ticket",
      });
    }

    // Convert booking date from IST to UTC
    const bookingDateUTC = moment(ticket.bookingDate)
      .tz("Asia/Kolkata")
      .startOf("day")
      .utc();

    // Check if the booking date is at least 24 hours away
    const bookingDateIST = moment(ticket.bookingDate).tz("Asia/Kolkata");
    const currentDateTimeIST = moment().tz("Asia/Kolkata");

    if (bookingDateIST.diff(currentDateTimeIST, "hours") < 24) {
      return res.status(400).json({
        success: false,
        message:
          "Tickets can only be cancelled at least 24 hours before the booking date",
      });
    }

    // Fetch the payment data using the ticketId
    const payment = await Payment.findOne({ ticketId: ticket._id });
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found for this ticket" });
    }

    const paymentId = payment.paymentId;
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Payment ID not found in payment data",
      });
    }

    // Proceed to initiate a refund using Razorpay
    const refund = await initiateRefund(
      paymentId,
      ticket.totalAmount,
      `refund_${ticket._id}`
    );

    if (!refund) {
      return res.status(500).json({
        success: false,
        message: "Failed to initiate refund. Please try again later.",
      });
    }

    // Find the corresponding slot document by date
    const slotDocument = await Slot.findOne({
      date: {
        $gte: bookingDateUTC.toDate(),
        $lt: bookingDateUTC.add(1, "days").toDate(),
      },
    });

    if (!slotDocument) {
      return res.status(404).json({
        success: false,
        message: "No slot found for this booking date",
      });
    }

    // Find the specific slot using the timeSlot from the ticket
    const slotToUpdate = slotDocument.slots.find(
      (slot) => slot.startTime === ticket.timeSlot
    );
    if (!slotToUpdate) {
      return res
        .status(404)
        .json({ success: false, message: "No corresponding slot time found" });
    }

    // Update the number of available tickets
    slotToUpdate.ticketsAvailable += ticket.ticketTypes.reduce(
      (acc, curr) => acc + curr.numberOfTickets,
      0
    );
    await slotDocument.save();

    // console.log(ticket.ticketTypes)

    const newCanceledTicket = new CanceledTicket({
      ticketId: ticket._id,
      userId: ticket.userId || ticket.guestUserId,
      userType: ticket.userId ? "Registered" : "Guest",
      bookingDate: ticket.bookingDate,
      canceledDate: new Date(),
      totalAmountRefunded: ticket.totalAmount,
      ticketDetails: ticket.ticketTypes,
    });
    await newCanceledTicket.save();

    // Proceed to delete the ticket
    await Ticket.findByIdAndDelete(ticketId);
    res.json({
      success: true,
      message: "Ticket cancelled successfully, and slot updated",
      refund: refund,
    });
  } catch (error) {
    console.error("Error cancelling ticket:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
