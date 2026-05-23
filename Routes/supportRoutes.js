const express = require("express");
const jwt = require("jsonwebtoken");
const Support = require("../models/Support");

const router = express.Router();

/* AUTH MIDDLEWARE */
function verifyUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      message: "No token provided"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid token"
    });
  }
}

/* SEND SUPPORT MESSAGE */
router.post("/", verifyUser, async (req, res) => {
  try {
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const support = await Support.create({
      userId: req.userId,
      subject,
      message
    });

    res.status(201).json({
      message: "Support message saved",
      support
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;