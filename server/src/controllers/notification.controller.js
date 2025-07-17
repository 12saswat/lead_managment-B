import { mongo } from "mongoose";
import { Notification } from "../models/notification.model.js";

// GET all notifications for current user
const getNotifications = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: "Unauthorized" },
      });
    }

    const recipientType = req.user.role === "manager" ? "manager" : "worker";

    const notifications = await Notification.find({
      recipient: req.user._id,
      recipientType: recipientType,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (notifications?.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No notifications found",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get notifications" },
    });
  }
};

// MARK as read
const markAsRead = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        error: { message: "Notification ID is required" },
      });
    }
    if (!mongo.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid Notification ID" },
      });
    }

    // Find the notification by ID and mark it as read
    const notification = await Notification.findByIdAndUpdate(req.params.id, {
      isRead: true,
    });
    res.json({ success: true, data: notification });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: { message: "Failed to mark as read" } });
  }
};

// DELETE
const deleteNotification = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(400).json({
        success: false,
        error: { message: "Notification ID is required" },
      });
    }
    if (mongo.ObjectId.isValid(req.params.id) === false) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid Notification ID" },
      });
    }

    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, error: { message: "Failed to delete" } });
  }
};

const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role === "manager" ? "manager" : "worker";

    if (!["worker", "manager"].includes(role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid user role",
        },
      });
    }

    const result = await Notification.deleteMany({
      recipient: userId,
      recipientType: role,
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`,
    });
  } catch (error) {
    console.error("Delete All Notifications Error:", error.message);
    return res.status(500).json({
      success: false,
      error: {
        message: "Failed to delete notifications",
      },
    });
  }
};

export {
  getNotifications,
  markAsRead,
  deleteNotification,
  deleteAllNotifications,
};
