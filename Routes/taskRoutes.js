const express = require("express");
const jwt = require("jsonwebtoken");
const Task = require("../models/task");

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

/* GET USER TASKS */
router.get("/", verifyUser, async (req, res) => {
  try {
    const tasks = await Task.find({
      userId: req.userId
    }).sort({ createdAt: -1 });

    res.json(tasks);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* ADD TASK */
router.post("/", verifyUser, async (req, res) => {
  try {
    const { name, date, time } = req.body;

    if (!name || !date || !time) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const task = await Task.create({
      userId: req.userId,
      name,
      date,
      time,
      done: false
    });

    res.status(201).json(task);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* UPDATE TASK */
router.put("/:id", verifyUser, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId
      },
      req.body,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json(task);

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

/* DELETE TASK */
router.delete("/:id", verifyUser, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!task) {
      return res.status(404).json({
        message: "Task not found"
      });
    }

    res.json({
      message: "Task deleted"
    });

  } catch (error) {
    res.status(500).json({
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;