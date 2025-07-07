import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  color: {
    type: String,
    default: '#000000', // optional: default color if not provided
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const category = mongoose.model('category', categorySchema);
export default category;
