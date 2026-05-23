const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./Routes/authRoutes");
const taskRoutes = require("./Routes/taskRoutes");
const supportRoutes = require("./Routes/supportRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/support", supportRoutes);

app.get("/", (req, res) => {
  res.send("DailyTasks Backend Running");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");

    app.listen(process.env.PORT, () => {
      console.log("Server running on port " + process.env.PORT);
    });
  })
  .catch((error) => {
    console.log("MongoDB Error:", error);
  });