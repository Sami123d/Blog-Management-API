const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load ENV
dotenv.config();
console.log("ENV LOADED:", process.env.REFRESH_EXPIRES_IN);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.json({ strict: false }));

// Import Routes
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
// const commentRoutes = require("./routes/commentRoutes");

// Default Route
app.get("/", (req, res) => {
  res.send("Blog Assessment API is running...");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
// app.use("/api/posts", commentRoutes); // nested comment routes

// MongoDB Connect + Server Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected to DB:", mongoose.connection.name);
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => console.log("DB Error:", err));
