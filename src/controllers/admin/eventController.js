import Event from "../../models/eventModel.js";

// List all events
export const listEvents = async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add a new event
// @Body Params
// {
//     "name": "Science Exhibition",
//     "description": "An exciting science exhibition.",
//     "startDate": "2024-06-15",
//     "endDate": "2024-06-20",
//     "location": "Science Center",
//     "prices": [
//       { "type": "adult", "weekDayPrice": 10, "weekEndPrice": 12 },
//       { "type": "child", "weekDayPrice": 5, "weekEndPrice": 6 },
//       { "type": "student", "weekDayPrice": 7, "weekEndPrice": 8 },
//       { "type": "senior", "weekDayPrice": 8, "weekEndPrice": 10 }
//     ]
//   }
export const addEvent = async (req, res) => {
  const { name, description, startDate, endDate, location, prices } = req.body;

  try {
    const newEvent = new Event({
      name,
      description,
      startDate,
      endDate,
      location,
      prices,
    });

    await newEvent.save();

    res
      .status(201)
      .json({ message: "Event added successfully", event: newEvent });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to add event", error: error.message });
  }
};

// Edit an existing event
// @Params
// id
// @Body Params
// Ex:
// {
//     "description": "A revised description of the science exhibition."
// }
export const editEvent = async (req, res) => {
  const { id } = req.params;
  const { name, description, startDate, endDate, location, prices } = req.body;

  try {
    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.name = name || event.name;
    event.description = description || event.description;
    event.startDate = startDate || event.startDate;
    event.endDate = endDate || event.endDate;
    event.location = location || event.location;
    event.prices = prices || event.prices;
    event.updatedAt = new Date();

    await event.save();

    res.status(200).json({ message: "Event updated successfully", event });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update event", error: error.message });
  }
};

// Remove an event
// @Params
// id
export const removeEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findByIdAndRemove(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.status(200).json({ message: "Event removed successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to remove event", error: error.message });
  }
};
