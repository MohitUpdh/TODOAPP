const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
const User = require("../models/User");

const router = express.Router();

const resend = new Resend(process.env.RESEND_API_KEY);

/* ================= SEND EMAIL FUNCTION ================= */

async function sendEmail(to, subject, html) {
  const { data, error } = await resend.emails.send({
    from: "DailyTasks <onboarding@resend.dev>",
    to: to,
    subject: subject,
    html: html
  });

  if (error) {
    console.log("RESEND EMAIL ERROR:", error);
    throw new Error(error.message || "Email send failed");
  }

  console.log("EMAIL SENT:", data);
  return data;
}

/* ================= REGISTER WITH OTP ================= */

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const oldUser = await User.findOne({ email });

    if (oldUser && oldUser.isVerified) {
      return res.status(400).json({
        message: "User already exists"
      });
    }

    const otp =
      Math.floor(100000 + Math.random() * 900000).toString();

    const otpExpire =
      Date.now() + 10 * 60 * 1000;

    const hashedPassword =
      await bcrypt.hash(password, 10);

    if (oldUser && !oldUser.isVerified) {
      oldUser.name = name;
      oldUser.password = hashedPassword;
      oldUser.otp = otp;
      oldUser.otpExpire = otpExpire;

      await oldUser.save();
    } else {
      await User.create({
        name,
        email,
        password: hashedPassword,
        isVerified: false,
        otp,
        otpExpire
      });
    }

    await sendEmail(
      email,
      "DailyTasks Email Verification OTP",
      `
      <div style="font-family:Arial,sans-serif;padding:20px;">
        <h2>DailyTasks Verification</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing:4px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
      `
    );

    res.status(201).json({
      message: "OTP sent to your email"
    });

  } catch (error) {
    console.log("REGISTER ERROR:", error);

    res.status(500).json({
      message: error.message || "Register failed"
    });
  }
});

/* ================= VERIFY REGISTER OTP ================= */

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        message: "Email already verified"
      });
    }

    const cleanOtp = otp.trim();

    if (user.otp !== cleanOtp) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({
        message: "OTP expired"
      });
    }

    user.isVerified = true;
    user.otp = "";
    user.otpExpire = null;

    await user.save();

    res.json({
      message: "Email verified successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================= LOGIN ================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: "Please verify your email first"
      });
    }

    const isMatch =
      await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password"
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login success",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================= FORGOT PASSWORD - SEND OTP ================= */

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    if (!user.isVerified) {
      return res.status(400).json({
        message: "Please verify your email first"
      });
    }

    const otp =
      Math.floor(100000 + Math.random() * 900000).toString();

    const otpExpire =
      Date.now() + 10 * 60 * 1000;

    user.otp = otp;
    user.otpExpire = otpExpire;

    await user.save();

    await sendEmail(
      email,
      "DailyTasks Password Reset OTP",
      `
      <div style="font-family:Arial,sans-serif;padding:20px;">
        <h2>Password Reset Request</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing:4px;">${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
      `
    );

    res.json({
      message: "OTP sent to your email"
    });

  } catch (error) {
    console.log("FORGOT PASSWORD ERROR:", error);

    res.status(500).json({
      message: error.message || "OTP send failed"
    });
  }
});

/* ================= VERIFY RESET OTP ================= */

router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    const cleanOtp = otp.trim();

    if (user.otp !== cleanOtp) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({
        message: "OTP expired"
      });
    }

    res.json({
      message: "OTP verified successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================= RESET PASSWORD ================= */

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    const cleanOtp = otp.trim();

    if (user.otp !== cleanOtp) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    if (user.otpExpire < Date.now()) {
      return res.status(400).json({
        message: "OTP expired"
      });
    }

    const hashedPassword =
      await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.otp = "";
    user.otpExpire = null;

    await user.save();

    res.json({
      message: "Password reset successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ================= TEST EMAIL ROUTE ================= */

router.get("/test-email", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    await sendEmail(
      email,
      "DailyTasks Test Email",
      `
      <div style="font-family:Arial,sans-serif;padding:20px;">
        <h2>DailyTasks Test Email</h2>
        <p>If you received this, email sending is working.</p>
      </div>
      `
    );

    res.json({
      message: "Test email sent"
    });

  } catch (error) {
    console.log("TEST EMAIL ERROR:", error);

    res.status(500).json({
      message: error.message
    });
  }
});

module.exports = router;