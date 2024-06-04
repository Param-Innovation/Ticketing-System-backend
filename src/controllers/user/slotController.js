import moment from "moment-timezone";
import Slot from "../../models/slotModel.js";

export const getOrCreateSlots = async (req, res) => {
  const dateInput = req.params.date || req.body.date;

  if (!dateInput) {
    return res.status(400).json({ message: "No date provided" });
  }
  console.log(dateInput);
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
