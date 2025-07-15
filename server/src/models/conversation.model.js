import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  conclusion: {
    type: String,
    required: true,
  },
  isProfitable: {
    type: Boolean,
    default: null,
  },
  followUpDate: {
    type: Date,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead', 
    required: true,
  },
   isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker', 
  },
});


const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
