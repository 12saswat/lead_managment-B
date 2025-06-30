import { Worker } from "../models/worker.models.js";

const registerWroker = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).send({
        message: "All fields are required",
      });
    }
    if (password.length < 6) {
      return res.status(400).send({
        message: "Password must be at least 6 characters",
      });
    }

    const workerExists = await Worker.findOne({ email });
    if (workerExists) {
      return res.status(400).send({
        message: "Worker already exists",
      });
    }

    const createdUser = await Worker.create({
      name,
      email,
      password,
    });

    const token = createdUser.generateToken();
    return res.status(201).cookie("token", token).json({
      success: true,
      status: 201,
      createdUser,
      token,
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

const loginWorker = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send({
        message: "All fields are required",
      });
    }

    const user = await Worker.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).send({
        message: "Invalid email or password",
        status: 400,
      });
    }

    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return res.status(400).send({
        message: "Invalid email or password",
        status: 400,
      });
    }

    const token = user.generateToken();
    return res.status(200).cookie("token", token).json({
      success: true,
      status: 200,
      user,
      token,
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

export { registerWroker, loginWorker };
