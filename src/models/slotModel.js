import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
    date: { type: Date, required: true, unique: true },
    slots: [{
        startTime: String,  // "HH:00" format
        ticketsAvailable: { type: Number, default: 20 }  // Max tickets per slot
    }]
});

const Slot = mongoose.model('Slot', slotSchema);
export default Slot;
