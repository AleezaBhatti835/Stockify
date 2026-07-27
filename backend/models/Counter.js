import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. 'purchase'
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

export async function getNextSequence(name, session) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );
  return counter.seq;
}

export default Counter;