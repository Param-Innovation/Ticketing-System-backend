// const Slot = require("../models/slotModel");

// exports.getOrCreateSlots = async (req, res) => {
//   // Check both URL params and body for date
//   // Expected format: 'YYYY-MM-DD'
//   const dateInput = req.params.date || req.body.date;

//   if (!dateInput) {
//     return res.status(400).json({ message: "No date provided" });
//   }

//   const requestedDate = new Date(dateInput);
//   // Adjust for IST timezone (+5:30)
//   const ISTOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
//   const today = new Date(Date.now() + ISTOffset);
//   today.setHours(0, 0, 0, 0); // Normalize today's date to start of the day IST

//   // Check if the requested date is in the past
//   if (requestedDate < today) {
//     return res
//       .status(400)
//       .json({ message: "Cannot check slots for past dates." });
//   }

//   const currentTimeIST = new Date(Date.now() + ISTOffset);

//   // If requested date is today, further filter slots that are already past
//   let filterPastSlots = requestedDate.toISOString() === today.toISOString();

//   try {
//     let slot = await Slot.findOne({ date: requestedDate });
//     if (slot && filterPastSlots) {
//       // Filter out past slots for today
//       slot.slots = slot.slots.filter(
//         (s) => {
//           const slotTime = new Date(`${dateInput}T${s.startTime}:00+05:30`); // Consider IST
//           return slotTime.getTime() > currentTimeIST.getTime();
//         }
//       );
//     }

//     if (!slot) {
//       // If no slots, create default slots for the day
//       slot = await createDefaultSlotsForDay(requestedDate);
//     }

//     res.status(200).json(slot);
//   } catch (error) {
//     res.status(500).json({ message: "Server error", error: error.message });
//   }
// };

// async function createDefaultSlotsForDay(date) {
//   const startHour = date.getDay() === 6 || date.getDay() === 0 ? 11 : 10; // Saturday or Sunday
//   const endHour = date.getDay() === 6 || date.getDay() === 0 ? 19 : 18;
//   const slots = [];

//   for (let hour = startHour; hour < endHour; hour++) {
//     slots.push({ startTime: `${hour}:00`, ticketsAvailable: 20 });
//   }

//   const newSlot = new Slot({ date, slots });
//   await newSlot.save();
//   return newSlot;
// }

const moment = require("moment-timezone");
const Slot = require("../../models/slotModel");

exports.getOrCreateSlots = async (req, res) => {
  const dateInput = req.params.date || req.body.date;

  if (!dateInput) {
    return res.status(400).json({ message: "No date provided" });
  }

  // Parse the date in the IST timezone
  const requestedDate = moment.tz(dateInput, "Asia/Kolkata");
  const today = moment().tz("Asia/Kolkata").startOf("day");
  const currentTimeIST = moment().tz("Asia/Kolkata");

  // Check if the requested date is in the past
  if (requestedDate.isBefore(today, "day")) {
    return res
      .status(400)
      .json({ message: "Cannot check slots for past dates." });
  }

  try {
    let slot = await Slot.findOne({ date: requestedDate.toDate() });

    if (!slot) {
      // Create slots if none exist for the requested day
      slot = await createDefaultSlotsForDay(requestedDate.toDate());
    }

    // Filter slots for today if the requested date is today
    if (requestedDate.isSame(today, "day")) {
      slot.slots = slot.slots.filter((s) => {
        const slotTime = moment.tz(
          `${dateInput} ${s.startTime}`,
          "Asia/Kolkata"
        );
        return slotTime.isAfter(currentTimeIST);
      });
    }

    res.status(200).json(slot);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

async function createDefaultSlotsForDay(date) {
  const dateMoment = moment(date).tz("Asia/Kolkata");
  const startHour = dateMoment.day() === 6 || dateMoment.day() === 0 ? 11 : 10; // Saturday or Sunday
  const endHour = dateMoment.day() === 6 || dateMoment.day() === 0 ? 19 : 18;
  const slots = [];

  for (let hour = startHour; hour < endHour; hour++) {
    slots.push({ startTime: `${hour}:00`, ticketsAvailable: 20 });
  }

  const newSlot = new Slot({ date: dateMoment.toDate(), slots });
  await newSlot.save();
  return newSlot;
}
