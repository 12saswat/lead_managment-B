import Lead from "../models/lead.model.js";
import Category from "../models/categories.model.js";
import Document from "../models/document.model.js";
import Conversation from "../models/conversation.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import xlsx from "xlsx";
import fs from "fs";
import mongoose from "mongoose";

const createLead = async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      category,
      position,
      leadSource,
      notes,
      status,
      priority,
    } = req.body;

    if (!name || (!email && !phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Name, email or phone are required",
        },
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid email format",
        },
      });
    }

    const existingLead = await Lead.findOne({ email });
    if (existingLead) {
      return res.status(409).json({
        success: false,
        error: {
          message: "Lead with this email already exists",
        },
      });
    }

    let categoryDoc = null;

    if (category) {
      // Validate category as a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          error: "Invalid category ID",
        });
      }

      // Find the category by ID
      categoryDoc = await Category.findById(category);
      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          error: "Category not found",
        });
      }
    }
    const documentRefs = [];

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const result = await uploadOnCloudinary(file.path);
        if (result?.secure_url) {
          // Create a new Document in DB
          const doc = await Document.create({
            url: result.secure_url,
            size: file.size,
            description: req.body.description || file.originalname,
          });

          documentRefs.push(doc);
        }
      }
    }

    const newLead = new Lead({
      name,
      email,
      phoneNumber,
      category: categoryDoc?._id || undefined,
      position,
      leadSource,
      notes,
      status,
      priority,
      documents: documentRefs,
    });
    await newLead.save();
    await newLead.populate({
      path: "documents",
      select: "url description size createdAt _id",
    });

    return res.status(201).json({
      success: true,
      response: {
        message: "Lead created successfully!",
      },
      data: newLead,
    });
  } catch (error) {
    console.error("Create Lead Error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Internal Server error",
      },
    });
  }
};

const getAllLeads = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, category } = req.query;
    const filter = { isDeleted: false };

    if (req.user?.role === "worker") {
      filter.assignedTo = req.user._id;
    }
    // Optional Filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const totalLeads = await Lead.countDocuments(filter);

    const leads = await Lead.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate("category", "title color description _id")
      .populate("createdBy", "name _id")
      .populate("assignedTo", "name _id")
      .lean();

    // Transform data to match response format
    const formattedLeads = leads.map((lead) => ({
      id: lead._id,
      name: lead.name,
      email: lead.email,
      phoneNumber: lead.phoneNumber,
      category: lead.category && {
        id: lead.category._id,
        title: lead.category.title,
        color: lead.category.color,
        description: lead.category.description,
      },
      position: lead.position,
      leadSource: lead.leadSource,
      notes: lead.notes,
      createdBy: lead.createdBy && {
        id: lead.createdBy._id,
        name: lead.createdBy.name,
      },
      assignedTo: lead.assignedTo && {
        id: lead.assignedTo._id,
        name: lead.assignedTo.name,
      },
      status: lead.status,
      priority: lead.priority,
      followUpDates: lead.followUpDates,
      lastContact: lead.lastContact,
      isDeleted: lead.isDeleted,
      createdAt: lead.createdAt,
    }));

    const totalPages = Math.ceil(totalLeads / limit);

    return res.status(200).json({
      success: true,
      response: {
        message: "Leads retrieved successfully!",
      },
      data: {
        leads: formattedLeads,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalLeads,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get All Leads Error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Internal Server error",
      },
    });
  }
};

const getLeadById = async (req, res) => {
  try {
    const leadId = req.params.id;
    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Lead ID is required",
        },
      });
    }

    const lead = await Lead.findOne({ _id: leadId, isDeleted: false })
      .populate("category", "title description color _id")
      .populate("createdBy", "name email _id")
      .populate("assignedTo", "name email _id")
      .populate({
        path: "campaignSent",
        select: "title type _id",
      })
      .populate({
        path: "documents",
        select: "url description size createdAt _id",
      })
      .populate({
        path: "Conversations",
        select: "date conclusion isProfitable followUpDate addedBy _id",
      })
      .lean();

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Lead not found",
        },
      });
    }

    const formattedLead = {
      id: lead._id,
      name: lead.name,
      email: lead.email,
      phoneNumber: lead.phoneNumber,
      category: lead.category && {
        id: lead.category._id,
        title: lead.category.title,
        description: lead.category.description,
        color: lead.category.color,
      },
      position: lead.position,
      leadSource: lead.leadSource,
      notes: lead.notes,
      createdBy: lead.createdBy && {
        id: lead.createdBy._id,
        name: lead.createdBy.name,
        email: lead.createdBy.email,
      },
      assignedTo: lead.assignedTo && {
        id: lead.assignedTo._id,
        name: lead.assignedTo.name,
        email: lead.assignedTo.email,
      },
      campaignSent: (lead.campaignSent || []).map((c) => ({
        id: c._id,
        title: c.title,
        type: c.type,
      })),
      status: lead.status,
      priority: lead.priority,
      followUpDates: lead.followUpDates,
      lastContact: lead.lastContact,
      documents: (lead.documents || []).map((doc) => ({
        id: doc._id,
        url: doc.url,
        description: doc.description,
        size: doc.size,
        createdAt: doc.createdAt,
      })),
      conversations: (lead.Conversations || []).map((conv) => ({
        id: conv._id,
        date: conv.date,
        conclusion: conv.conclusion,
        isProfitable: conv.isProfitable,
        followUpDate: conv.followUpDate,
        addedBy: conv.addedBy,
      })),
      isDeleted: lead.isDeleted,
      createdAt: lead.createdAt,
    };

    return res.status(200).json({
      success: true,
      response: {
        message: "Lead retrieved successfully!",
      },
      data: formattedLead,
    });
  } catch (error) {
    console.error("Get Lead by ID Error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Internal Server error",
      },
    });
  }
};

const updateLeadById = async (req, res) => {
  try {
    const leadId = req.params.id;
    const {
      name,
      email,
      phoneNumber,
      category,
      position,
      leadSource,
      notes,
      status,
      priority,
      followUpDates,
      lastContact,
    } = req.body;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Lead ID is required",
        },
      });
    }
    // Check for valid email
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid email format",
        },
      });
    }

    // Validate status and priority
    const validStatus = ["new", "in-progress", "follow-up", "closed"];
    const validPriority = ["high", "medium", "low"];

    if (status && !validStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Invalid status. Must be one of: new, in-progress, follow-up, closed",
        },
      });
    }

    if (priority && !validPriority.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid priority. Must be one of: high, medium, low",
        },
      });
    }

    // Check if lead exists
    const existingLead = await Lead.findById(leadId);
    if (!existingLead || existingLead.isDeleted) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Lead not found",
        },
      });
    }

    // Check if email already exists on another lead
    if (email) {
      const duplicate = await Lead.findOne({
        _id: { $ne: leadId },
        email,
        isDeleted: false,
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: {
            message: "Lead with this email already exists",
          },
        });
      }
    }

    // Check if category exists
    if (category && !(await Category.findById(category))) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Category not found",
        },
      });
    }

    // Update lead
    const updateData = {
      name,
      email,
      phoneNumber,
      category,
      position,
      leadSource,
      notes,
      status,
      priority,
      followUpDates,
      lastContact,
    };

    // Remove undefined/null to avoid overwriting
    // Object.keys(updateData).forEach((key) => {
    //   if (updateData[key] === undefined || updateData[key] === null) {
    //     delete updateData[key];
    //   }
    // });

    await Lead.findByIdAndUpdate(leadId, updateData, { new: true });

    return res.status(200).json({
      success: true,
      response: {
        message: "Lead updated successfully!",
      },
      data: null,
    });
  } catch (error) {
    console.error("Update Lead Error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Internal Server error",
      },
    });
  }
};

const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findOne({ _id: id, isDeleted: false });

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          message: "Lead not found",
        },
      });
    }

    if (lead.assignedTo) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Cannot delete lead with active assignments",
        },
      });
    }

    lead.isDeleted = true;
    await lead.save();

    return res.status(200).json({
      success: true,
      response: {
        message: "Lead deleted successfully!",
      },
      data: null,
    });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Internal Server error",
      },
    });
  }
};

const bulkUploadLeads = async (req, res) => {
  try {
    const { category, assignedTo } = req.body;

    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        error: {
          message: req.fileValidationError,
        },
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: "No file uploaded",
        },
      });
    }

    const workbook = xlsx.readFile(req.file.path);

    // console.log("Workbook:", workbook);
    console.log("Sheet Names:", workbook.SheetNames);
    if (workbook.SheetNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Uploaded file is empty or invalid",
        },
      });
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let totalProcessed = 0;
    let successful = 0;
    let failed = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      totalProcessed++;
      const row = rows[i];

      if (!row.name || !row.email) {
        failed++;
        errors.push({
          row: i + 2,
          error: "Missing required field: name or email",
        });
        continue;
      }

      if (!/^\S+@\S+\.\S+$/.test(row.email)) {
        failed++;
        errors.push({
          row: i + 2,
          error: "Invalid email format",
        });
        continue;
      }

      try {
        await Lead.create({
          name: row.name,
          email: row.email.toLowerCase(),
          phoneNumber: row.phoneNumber || null,
          category,
          position: row.position || "",
          leadSource: row.leadSource || "",
          notes: row.notes || "",
          createdBy: req.user._id,
          assignedTo,
          status: row.status || "new",
          priority: row.priority || "medium",
        });
        successful++;
      } catch (err) {
        console.error("Error creating lead:", err);
        failed++;
        errors.push({
          row: i + 2,
          error: "Database error or duplicate entry",
        });
      }
    }

    // Delete uploaded file after processing
    fs.unlink(req.file.path, () => {});

    return res.status(201).json({
      success: true,
      response: {
        message: "Leads uploaded successfully!",
      },
      data: {
        totalProcessed,
        successful,
        failed,
        errors,
      },
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Internal Server error",
      },
    });
  }
};

const addFollowUp = async (req, res) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: { message: "Lead ID is required" },
      });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: { message: "Lead not found" },
      });
    }

    const { followUpDate, conclusion } = req.body;

    if (
      !followUpDate ||
      followUpDate.trim() === "" ||
      !conclusion ||
      conclusion.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        error: { message: "Follow-up date and notes are required" },
      });
    }

    const followUpDateObj = new Date(followUpDate);
    const now = new Date();

    if (isNaN(followUpDateObj.getTime()) || followUpDateObj <= now) {
      return res.status(400).json({
        success: false,
        error: { message: "Follow-up date must be in the future" },
      });
    }

    const newConversation = new Conversation({
      date: followUpDate,
      conclusion: conclusion,
      addedBy: lead._id,
    });

    await newConversation.save();

    lead.Conversations.push(newConversation._id);
    lead.status = "follow-up";
    lead.lastContact = now;
    lead.followUpDates.push(followUpDate);

    await lead.save();

    return res.status(200).json({
      success: true,
      response: {
        message: "Follow-up added via conversation successfully!",
      },
      data: {
        leadId: lead._id,
        conversation: newConversation,
      },
    });
  } catch (error) {
    console.error("Error adding follow-up (conversation):", error);
    return res.status(500).json({
      success: false,
      error: { message: "Internal Server error" },
    });
  }
};

export {
  createLead,
  getAllLeads,
  getLeadById,
  updateLeadById,
  deleteLead,
  bulkUploadLeads,
  addFollowUp,
};
