const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Test DB connection on startup
pool.connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL");
    client.release();
  })
  .catch((err) => console.error("❌ PostgreSQL connection error:", err.message));

// ─── Transfers ───────────────────────────────────────────────────────────────

// POST /api/transfer — save a fiat_in or fiat_out record
app.post("/api/transfer", async (req, res) => {
  const { type, from, to, amount, reference, txHash, token, network,
          fiat_amount, fiat_currency, fx_rate } = req.body;

  if (!type || !from || !amount || !token || !network) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  if (type === "fiat_out" && (!to || !txHash)) {
    return res.status(400).json({ success: false, message: "Fiat Out requires 'to' and 'txHash'" });
  }

  try {
    await pool.query(
      `INSERT INTO transfers (type, "from", "to", amount, reference, tx_hash, token, network,
                              fiat_amount, fiat_currency, fx_rate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [type, from, to || null, amount, reference || "", txHash || null, token, network,
       fiat_amount || null, fiat_currency || null, fx_rate || null]
    );
    res.status(201).json({ success: true, message: `✅ ${type} transfer logged` });
  } catch (err) {
    console.error("❌ POST /api/transfer error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/transfer — fetch all transfer logs
app.get("/api/transfer", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM transfers ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Subscriptions ───────────────────────────────────────────────────────────

// POST /api/subscribe — save a new subscription
app.post("/api/subscribe", async (req, res) => {
  const { name, nickname, email, address, wallet, txHash, paidAt, expiresAt } = req.body;

  if (!name || !nickname || !email || !address || !wallet || !txHash) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    await pool.query(
      `INSERT INTO subscriptions (name, nickname, email, address, wallet, tx_hash, paid_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [name, nickname, email, address, wallet, txHash,
       new Date(paidAt), new Date(expiresAt)]
    );
    res.status(201).json({ success: true, message: "✅ Subscription saved" });
  } catch (err) {
    if (err.code === "23505") {
      // unique_violation on nickname
      return res.status(409).json({ success: false, message: "Nickname already taken" });
    }
    console.error("❌ POST /api/subscribe error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/subscribe — count active subscribers OR check nickname availability
app.get("/api/subscribe", async (req, res) => {
  const { nickname } = req.query;
  try {
    if (nickname) {
      const result = await pool.query(
        `SELECT 1 FROM subscriptions WHERE LOWER(nickname) = LOWER($1) LIMIT 1`,
        [nickname]
      );
      return res.json({ taken: result.rowCount > 0 });
    }
    const result = await pool.query(
      `SELECT COUNT(*) FROM subscriptions WHERE active = TRUE AND expires_at > NOW()`
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running at http://localhost:${PORT}`));
