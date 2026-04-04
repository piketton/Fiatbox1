-- Run this once to set up the database tables

CREATE TABLE IF NOT EXISTS transfers (
  id           SERIAL PRIMARY KEY,
  type         VARCHAR(10)  NOT NULL CHECK (type IN ('fiat_in', 'fiat_out')),
  "from"       VARCHAR(42)  NOT NULL,
  "to"         VARCHAR(42)  DEFAULT NULL,
  amount       VARCHAR(50)  NOT NULL,
  reference    TEXT         DEFAULT '',
  tx_hash       VARCHAR(66)    DEFAULT NULL,
  token         VARCHAR(10)    NOT NULL,
  network       VARCHAR(20)    NOT NULL,
  fiat_amount   NUMERIC(18,4)  DEFAULT NULL,
  fiat_currency VARCHAR(3)     DEFAULT NULL,
  fx_rate       NUMERIC(18,6)  DEFAULT NULL,
  created_at    TIMESTAMP      DEFAULT NOW(),
  updated_at    TIMESTAMP      DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  nickname     VARCHAR(255) NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL,
  address      TEXT         NOT NULL,
  wallet       VARCHAR(42)  NOT NULL,
  tx_hash      VARCHAR(66)  NOT NULL,
  paid_at      TIMESTAMP    NOT NULL,
  expires_at   TIMESTAMP    NOT NULL,
  active       BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT NOW(),
  updated_at   TIMESTAMP    DEFAULT NOW()
);
