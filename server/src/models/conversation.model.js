import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  date: {
    type: String,
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
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lead",
    required: true,
  },
});

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
