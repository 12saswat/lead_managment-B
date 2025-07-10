import Assignment from "../models/assignment.model.js";
import Lead from "../models/lead.model.js";
import { Worker } from "../models/worker.models.js";

const assignedTo = async (req, res) => {
  try {
    const { assignedTo, priority, notes } = req.body;
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

    // Create assignment
    const assignment = new Assignment({
      createdBy: req.user._id, // Manager
      assignedTo,
      leads: [lead._id],
      priority,
      notes,
    });

    await assignment.save();

    // Embed worker info into lead
   await Lead.findByIdAndUpdate(leadId, {
        $push: {
          assignedTo: {
          workerId: worker._id,
          name: worker.name,
          email: worker.email,
          assignedAt: new Date(),
    },
  },
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
