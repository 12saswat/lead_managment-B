import { Manager } from "../models/manager.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import { JWT_SECRET } from "../constants.js";

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

    const token = jwt.sign(
      { id: manager._id, role: "manager" },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ token, manager });
  } catch (error) {
    console.error("Error in loginManager:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
