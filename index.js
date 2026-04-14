const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Load ENV
dotenv.config();
console.log("ENV LOADED:", process.env.REFRESH_EXPIRES_IN);

const app = express();

// Middlewares
// app.use(cors());
app.use(cors({
  origin: ["http://localhost:5173", "https://blog-management-nine-neon.vercel.app"],
  credentials: true
}));


// app.use(express.json());
app.use(express.json({ strict: false }));

// // allow cross-origin requests
// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers", 
//     "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });
// Import Routes
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const secondPostRoute = require("./routes/posts")
// const commentRoutes = require("./routes/commentRoutes");

// Default Route
app.get("/", (req, res) => {
  res.send("Blog Assessment API is running...");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/ourpost",secondPostRoute);

// app.use("/api/posts", commentRoutes); // nested comment routes

// MongoDB Connect + Server Start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected to DB:", mongoose.connection.name);
    const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

  })
  .catch((err) => console.log("DB Error:", err));
