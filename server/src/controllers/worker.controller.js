import { Worker } from "../models/worker.models.js";
import { generateEncryptedKey, generateRoleToken } from "../utils/RoleToken.js";

const registerWorker = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      throw new Error("All fields are required");
    }
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        statusCode: 400,
        message: "password must be at least 6 characters",
      });
    }

    const workerExists = await Worker.findOne({ email });
    if (workerExists) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Worker already exists",
      });
    }

    const createdUser = await Worker.create({
      name,
      email,
      password,
    });

    const token = createdUser.generateAccessToken();
    console.log(token);
    return res.status(201).cookie("token", token).json({
      success: true,
      statusCode: 201,
      createdUser,
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error.message || "Internal Server Error",
    });
  }
};

const loginWorker = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new Error("All fields are required");
    }

    const user = await Worker.findOne({ email }).select("+password");
    if (!user) {
      throw new Error("Invalid credintials");
    }

    const isPasswordMatched = await user.isPasswordCorrect(password);
    if (!isPasswordMatched) {
      throw new Error("Invalid credintials");
    }

    const token = user.generateAccessToken();

    // Generate a JWT token containing the user's role
    const roleToken = generateRoleToken("worker", process.env.WRK_SUFFIX);

    // Generate a randomized cookie key (prefixed with '001') for storing the role token
    const key = generateEncryptedKey(process.env.WRK_KEY_NAME); // '001'

    return res.status(200).cookie("token", token).cookie(key, roleToken).json({
      message: "Login Successfull",
      success: true,
      statusCode: 200,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: error || "Internal Server Error",
    });
  }
};

export { registerWorker, loginWorker };
