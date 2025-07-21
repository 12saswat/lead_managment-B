import { Manager } from "../models/manager.model.js";
import { Worker } from "../models/worker.models.js";

export const userName = async (req, res) => {
  try {
    const { _id, role } = req.user;

    let user = null;

    if (role === "manager") {
      user = await Manager.findById(_id).select("name email");
    } else if (role === "worker") {
      user = await Worker.findById(_id).select("name email");
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found",
        },
      });
    }

    res.status(200).json({
      success: true,
      response: {
        message: "Current user retrieved successfully",
      },
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role,
      },
    });
  } catch (err) {
    console.error("Error retrieving current user:", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal Server Error",
      },
    });
  }
};
