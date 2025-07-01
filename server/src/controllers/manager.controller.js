import { Manager } from "../models/manager.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginManager = async (req, res) => {
  const { email, password } = req.body;

  try {
    const manager = await Manager.findOne({ email });
    if (!manager) {
      return res.status(404).json({ message: "Manager not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, manager.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = manager.generateAccessToken();

    res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    manager: {
    id: manager._id,
    name: manager.name,
    email: manager.email,
    role: manager.role,
    createdAt: manager.createdAt,
  },
});
  } catch (error) {
    console.error("Error in loginManager:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
