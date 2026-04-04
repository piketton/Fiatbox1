const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema(
  {
    from: String,
    to: String,
    amount: String,
    reference: String,
    txHash: String,
    token: String, // Optional: Track USDT or USDC
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transfer", transferSchema);

