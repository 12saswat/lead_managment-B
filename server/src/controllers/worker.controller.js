import { Worker } from "../models/worker.models.js";
import generateOtp from "../utils/generateOtp.js";
import { generateEncryptedKey, generateRoleToken } from "../utils/RoleToken.js";
import sendEmail from "../utils/mailer.js";
import { error } from "console";

const registerWorker = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: "All fields are required",
        },
      });
    }
    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: "password must be at least 6 characters",
      });
    }

    const workerExists = await Worker.findOne({ email });
    if (workerExists) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Worker already exits",
        },
      });
    }

    const createdUser = await Worker.create({
      name,
      email,
      password,
    });

    const token = createdUser.generateAccessToken();

    return res
      .status(201)
      .cookie("token", token)
      .json({
        success: true,
        response: {
          message: "Worker created successfully!",
        },
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Internal Server error",
      },
    });
  }
};

const loginWorker = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: "All fields are required",
        },
      });
    }

    const user = await Worker.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "No worker exists",
        },
      });
    }

    const isPasswordMatched = await user.isPasswordCorrect(password);
    if (!isPasswordMatched) {
      return res.status(401).json({
        success: false,
        error: {
          message: "Invalid Password",
        },
      });
    }

    const token = user.generateAccessToken();

    // Generate a JWT token containing the user's role
    const roleToken = generateRoleToken("worker", process.env.WRK_SUFFIX);

    // Generate a randomized cookie key (prefixed with '001') for storing the role token
    const key = generateEncryptedKey(process.env.WRK_KEY_NAME); // '001'

    const cookiesOption = {
      sameSite : 'strict',
      httpOnly:true,
      domain : ".vercel.app",
      secure:true
    }

    return res
      .status(200)
      .cookie("token", token,cookiesOption)
      .cookie(key, roleToken,cookiesOption)
      .json({
        success: true,
        response: {
          message: "Worker Logged in successfully!",
        },
        data: null,
      });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: {
        message: "Internal Server error",
      },
    });
  }
};

const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const worker = await Worker.findOne({ email });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: "Worker not found",
      });
    }

    // generate 6 digit otp
    const otp = generateOtp();
    const expiry = Date.now() + 10 * 60 * 1000;

    worker.otp = otp;
    // set expiry time to 10 minutes from now
    worker.otpExpiry = expiry;
    await worker.save();

    const linkUrl = `${process.env.CLIENT_URL}/reset-password/${worker._id}`;

    // Email content
    // Use a template literal to create the HTML content
    // HTML email content
    const html = `
      <p>Your OTP is <strong>${otp}</strong>. It is valid for 10 minutes.</p>
      <p>You can also reset your password directly using the link below:</p>
      <a href="${linkUrl}" style="display:inline-block;padding:10px 20px;background-color:#007BFF;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
    `;

    // Send the email using the sendEmail utility
    await sendEmail({ to: email, subject: "Password Reset OTP", html });
    res.status(200).json({
      success: true,
      response: {
        message: "OTP sent successfully",
      },
      data: {
        workerId: worker._id,
        RedirectUrl: linkUrl,
      },
    });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal Server Error",
      },
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({
        success: false,
        error: {
          message: "OTP is required",
        },
      });
    }

    const userId = req.params.id;
    const user = await Worker.findById(userId);

    if (!user || !user.otp || !user.otpExpiry) {
      return res.status(400).json({
        success: false,
        error: {
          message: "OTP not found or expired",
        },
      });
    }

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({
        success: false,
        error: {
          message: "Invalid or expired OTP",
        },
      });
    }

    res.status(200).json({
      success: true,
      response: {
        message: "OTP verified successfully",
      },
      data: {
        workerId: user,
      },
    });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal Server Error",
      },
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: "New password is required",
        },
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({    //  <-- return was missing here
        success: false,
        message: "password must be at least 6 characters",
      });
    }

    const userId = req.params.id;
    const user = await Worker.findById(userId).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          message: "User not found",
        },
      });
    }

    const isSamePassword = await user.isPasswordCorrect(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: {
          message: "New password cannot be the same as the old password",
        },
      });
    }

    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      response: {
        message: "Password reset successfully",
      },
    });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({
      success: false,
      error: {
        message: "Internal Server Error",
      },
    });
  }
};
export { registerWorker, loginWorker, sendOtp, verifyOtp, resetPassword };
