const Slot = require("../models/slotModel");

// Helper function to convert date to IST
function toIST(date) {
  return new Date(date.getTime() + (330 + date.getTimezoneOffset()) * 60000); // +5:30 IST
}

exports.getOrCreateSlots = async (req, res) => {
  const { date } = req.params; // Expected format: 'YYYY-MM-DD'
  const inputDate = new Date(date + "T00:00:00.000Z"); // Ensure the date is at midnight UTC
  const localDate = toIST(inputDate); // Convert to IST
  const dayOfWeek = localDate.getDay();

  // Define slot times based on day of the week
  let startHour = dayOfWeek === 6 || dayOfWeek === 0 ? 11 : 10; // 6 = Saturday, 0 = Sunday
  let endHour = dayOfWeek === 6 || dayOfWeek === 0 ? 19 : 18;

  try {
    let slot = await Slot.findOne({ date: localDate });

    if (!slot) {
      const slots = [];
      for (let hour = startHour; hour < endHour; hour++) {
        slots.push({
          startTime: `${hour}:00`,
          endTime: `${hour + 1}:00`,
          ticketsAvailable: 20, // Initialize with the max tickets available
        });
      }

      slot = new Slot({ date: localDate, slots });
      await slot.save();
    }

    // Prepare data to return: filter out slots with no tickets available if necessary
    const availableSlots = slot.slots
      .map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        ticketsAvailable: slot.ticketsAvailable,
      }))
      .filter((slot) => slot.ticketsAvailable > 0);

    res.status(200).json({ date: localDate, slots: availableSlots });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
