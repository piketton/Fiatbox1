const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Transfer = require("./transferModel");

const app = express();
app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// POST route: Save a USDT transfer
app.post("/api/transfer", async (req, res) => {
  try {
    const { from, to, amount, reference, txHash } = req.body;
    const log = new Transfer({ from, to, amount, reference, txHash });
    await log.save();
    res.status(201).json({ success: true, message: "Transfer logged ✅" });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// Optional: Get all logs
app.get("/api/transfer", async (req, res) => {
  const logs = await Transfer.find().sort({ createdAt: -1 });
  res.json(logs);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));
