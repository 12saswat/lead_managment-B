import { Manager } from "../models/manager.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateEncryptedKey, generateRoleToken, } from "../utils/RoleToken.js";

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

    // Generate a JWT token containing the manger's role
    const roleToken = generateRoleToken("manager", process.env.MAN_SUFFIX);

    // Generate a randomized cookie key (prefixed with '002') for storing the role token
    const key = generateEncryptedKey(process.env.MAN_KEY_NAME); // '002'


    //Cookie Options 
     const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV == 'development' ? false : true,
            domain: process.env.NODE_ENV == 'development' ? "localhost" : ".vercel.app",
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        }

    // Set cookies (can add httpOnly, secure, sameSite as needed)
    return res
      .status(200)
      .cookie("token", token,cookieOptions)
      .cookie(key, roleToken,cookieOptions)
      .json({
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
