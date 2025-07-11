import Assignment from "../models/assignment.model.js";
import Lead from "../models/lead.model.js";
import { Worker } from "../models/worker.models.js";
import Category from "../models/categories.model.js";


const assignedTo = async (req, res) => {
  try {
    const { assignedTo, priority, notes , dueDate , Category:categoryName } = req.body;
    const leadId = req.params.id;

    if (!assignedTo || !priority) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: "Assigned worker and priority are required",
        },
      });
    }

    const allowedPriorities = ["low", "medium", "high", "urgent"];
    if (!allowedPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: "Invalid priority. Must be one of: low, medium, high, urgent",
        },
      });
    }

     // Validate dueDate
    if (dueDate && new Date(dueDate) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: "Due date must be in the future",
        },
      });
    }

    // Check lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: 404,
          message: "Lead not found",
        },
      });
    }

    // Check worker exists
    const worker = await Worker.findById(assignedTo);
    if (!worker) {
      return res.status(404).json({
        success: false,
        error: {
          code: 404,
          message: "Worker not found",
        },
      });
    }

   
  // Check if already assigned
const alreadyAssigned = Array.isArray(lead.assignedTo) &&
  lead.assignedTo.some((a) => a.workerId?.toString() === assignedTo?.toString());



    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        error: {
          code: 400,
          message: "Lead is already assigned to this worker",
        },
      });
    }

      // Get category by name
    let categoryId = lead.category; 
    if (categoryName) {
      const categoryDoc = await Category.findOne({ title: categoryName });
      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            message: `Category '${categoryName}' not found`,
          },
        });
      }
      categoryId = categoryDoc._id;
    }

    // Create assignment
    const assignment = new Assignment({
      createdBy: req.user._id, 
      assignedTo,
      leads: [lead._id],
      priority,
      notes,
      FollowUpDate: new Date(dueDate),
      dueDate: new Date(dueDate), 
    });

    await assignment.save();

    
   await Lead.findByIdAndUpdate(leadId, {
        $push: {
          assignedTo: {
          workerId: worker._id,
          name: worker.name,
          email: worker.email,
          assignedAt: new Date(),
          dueDate: new Date(dueDate),
    },
  },
         category: categoryId,
         followUpDates: new Date(dueDate),
});

    return res.status(200).json({
      success: true,
      response: {
        code: 200,
        message: "Lead assigned successfully!",
      },
      data: {
        assignmentId: assignment._id,
        createdBy: assignment.createdBy,
        assignedTo: assignment.assignedTo,
        leads: assignment.leads,
        priority: assignment.priority,
        status: assignment.status,
        createdAt: assignment.createdAt,
        dueDate: assignment.dueDate,
      },
    });
  } catch (error) {
    console.error("Error assigning lead:", error);
    return res.status(500).json({
      success: false,
      error: {
        code: 500,
        message: "Internal Server error",
      },
    });
  }
};

export { assignedTo };
