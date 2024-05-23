import mongoose from 'mongoose';

const ticketTypePriceSchema = new mongoose.Schema({
  type: { type: String, enum: ['adult', 'child', 'student', 'senior'], required: true },
  weekDayPrice: { type: Number, required: true },
  weekEndPrice: { type: Number, required: true }
});

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, required: true },
  prices: [ticketTypePriceSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
