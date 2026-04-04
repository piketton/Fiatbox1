const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Transfer = require("./transferModel");

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// POST route: Save a transfer
app.post("/api/transfer", async (req, res) => {
  try {
    const { from, to, amount, reference, txHash, token } = req.body;

    if (!from || !to || !amount || !txHash) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const transfer = new Transfer({
      from,
      to,
      amount,
      reference,
      txHash,
      token: token || "USDT", // default if not specified
    });

    await transfer.save();

    res.status(201).json({ success: true, message: "✅ Transfer logged" });
  } catch (err) {
    console.error("❌ POST /api/transfer error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET route: Fetch all transfer logs
app.get("/api/transfer", async (req, res) => {
  try {
    const logs = await Transfer.find().sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ success: false, error: "Could not fetch transfers" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running at http://localhost:${PORT}`));
