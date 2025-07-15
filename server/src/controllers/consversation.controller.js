import Conversation from "../models/conversation.model.js";
import Lead from "../models/lead.model.js";
import mongoose from "mongoose";

const createConversation = async (req, res) => {
  try {
    const { conclusion, isProfitable = null, followUpDate, date } = req.body;
    const { leadId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID" });
    }

    const conversation = new Conversation({
      lead: leadId,
      date: date ? new Date(date) : new Date(),
      addedBy: req.user._id,
      conclusion,
      isProfitable,
      followUpDate,
    });

    await conversation.save();

    await Lead.findByIdAndUpdate(leadId, {
      $push: {
        conversations: conversation._id,
        followUpDates: followUpDate,
      },
      $set: {
        lastContact: new Date(),
      },
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error("Create Conversation Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



const getConversationsByLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await Lead.findById(leadId).lean(); 
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const isManager = req.user?.role === "manager";

    const filter = {
      _id: { $in: lead.conversations },
      ...(isManager ? {} : { isDeleted: false }),
    };

    const conversations = await Conversation.find(filter)
      .sort({ date: -1 })
      .populate("addedBy", "name _id")
      .populate("deletedBy", "name _id")
      .lean();

    res.status(200).json({
      success: true,
       id: lead._id,
        followUpDates: lead.followUpDates,
        notes: lead.notes,
      data: conversations,
    });
  } catch (error) {
    console.error("Get Conversations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};




const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { conclusion, isProfitable } = req.body;

    const updated = await Conversation.findByIdAndUpdate(
      id,
      { conclusion, isProfitable },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update Conversation Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    const convo = await Conversation.findByIdAndUpdate(id,{ isDeleted: true, deletedBy: req.user._id },{ new: true });
    if (!convo) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    res.status(200).json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    console.error("Delete Conversation Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


export {
    createConversation,
  getConversationsByLead,
  updateConversation,
  deleteConversation,
};
