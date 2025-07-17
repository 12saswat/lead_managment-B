import Conversation from "../models/conversation.model.js";
import Lead from "../models/lead.model.js";
import mongoose from "mongoose";
import Category from "../models/categories.model.js";
import{Worker}  from "../models/worker.models.js";
import { Manager } from "../models/manager.model.js";

const endConversation = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { notes, isProfitable } = req.body || {}; ;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID" });
    }

    const updated = await Lead.findByIdAndUpdate(
      leadId,
      { notes, isProfitable },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Lead not found" });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update Lead Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};


const getAllConversations = async (req, res) => {
  try {
    const filter = { isDeleted: false };
    if (req.user.role !== "manager") filter.addedBy = req.user._id;

    const conversations = await Conversation.find(filter).lean();

    const leadIds = [...new Set(conversations.map(c => c.lead).filter(Boolean))];
    const userIds = [...new Set(conversations.map(c => c.addedBy).filter(Boolean))];

    const leads = await Lead.find({ _id: { $in: leadIds } }).lean();
    const categoryIds = [...new Set(leads.map(l => l.category).filter(Boolean))];
    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();

    // Fetch from both worker and manager models
    const [workers, managers] = await Promise.all([
      Worker.find({ _id: { $in: userIds } }).select('name').lean(),
      Manager.find({ _id: { $in: userIds } }).select('name').lean(),
    ]);

    const allUsers = [...workers, ...managers];
    const leadMap = new Map(leads.map(l => [String(l._id), l]));
    const categoryMap = new Map(categories.map(c => [String(c._id), c]));
    const userMap = new Map(allUsers.map(u => [String(u._id), u]));

   const result = conversations.map(convo => {
  const lead = leadMap.get(String(convo.lead));
  const user = userMap.get(String(convo.addedBy));
  const cat = lead ? categoryMap.get(String(lead.category)) : null;

  const addedByRole = workers.find(w => String(w._id) === String(convo.addedBy))
    ? 'worker'
    : 'manager';

 
  const userName = user?.name || user?.fullName || null;

  return {
    conversation: convo,
    meta: {
      leadName: lead?.name ?? null,
      leadId: lead?._id ?? null,
      followupDate: lead?.followUpDates?.[0] ?? null,
      status: lead?.status ?? null,

      [`${addedByRole}Name`]: userName,
      [`${addedByRole}Id`]: user?._id ?? null,

      categoryId: cat?._id ?? null,
      categoryTitle: cat?.title ?? null,
      categoryColor: cat?.color ?? null,
    }
  };
});


    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Get All Conversations Error:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
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

 const baseFilter = {
  _id: { $in: lead.conversations },
};

const workerFilter = {
  ...baseFilter,
  isDeleted: false,
  addedBy: req.user._id,
};

const finalFilter = isManager ? baseFilter : workerFilter;

    const conversations = await Conversation.find(finalFilter)
      .sort({ date: -1 })
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

const getConversationsByWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const loggedInUser = req.user;

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({ success: false, message: "Invalid worker ID" });
    }

    const isManager = loggedInUser?.role === "manager";
    const isSelf = loggedInUser._id.toString() === workerId;

    // Only allow manager or the same worker
    if (!isManager && !isSelf) {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    const filter = {
      addedBy: workerId,
      isDeleted: false,
    };

    const conversations = await Conversation.find(filter)
      .sort({ date: -1 })
      .lean();

    res.status(200).json({ success: true, data: conversations });

  } catch (error) {
    console.error("Get Conversations By Worker Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
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


export { getAllConversations,
  getConversationsByLead,
  getConversationsByWorker,
  endConversation,
  updateConversation,
  deleteConversation,
};
