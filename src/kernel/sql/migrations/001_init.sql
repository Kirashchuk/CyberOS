PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_bindings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chain TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  UNIQUE(chain, address),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  inviter_user_id TEXT NOT NULL,
  invitee_user_id TEXT,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  accepted_at TEXT,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(inviter_user_id) REFERENCES users(id),
  FOREIGN KEY(invitee_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS referral_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  commission_bps INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_links (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  referrer_user_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(program_id) REFERENCES referral_programs(id),
  FOREIGN KEY(referrer_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS referral_rewards (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL,
  referrer_user_id TEXT NOT NULL,
  referee_user_id TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(program_id) REFERENCES referral_programs(id),
  FOREIGN KEY(referrer_user_id) REFERENCES users(id),
  FOREIGN KEY(referee_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS script_instances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  script_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS copy_trading_subscriptions (
  id TEXT PRIMARY KEY,
  follower_user_id TEXT NOT NULL,
  leader_user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(follower_user_id) REFERENCES users(id),
  FOREIGN KEY(leader_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS nado_subaccounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  exchange TEXT NOT NULL,
  exchange_subaccount_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  UNIQUE(exchange, exchange_subaccount_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS execution_intents (
  id TEXT PRIMARY KEY,
  subaccount_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity REAL NOT NULL,
  strategy_tag TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(subaccount_id) REFERENCES nado_subaccounts(id)
);

CREATE TABLE IF NOT EXISTS order_executions (
  id TEXT PRIMARY KEY,
  execution_intent_id TEXT,
  gateway_order_id TEXT,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  executed_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(execution_intent_id) REFERENCES execution_intents(id)
);

CREATE TABLE IF NOT EXISTS subaccount_snapshots (
  id TEXT PRIMARY KEY,
  subaccount_id TEXT NOT NULL,
  equity_usd REAL NOT NULL,
  pnl_usd REAL NOT NULL,
  exposure_usd REAL NOT NULL,
  snapshot_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(subaccount_id) REFERENCES nado_subaccounts(id)
);

CREATE TABLE IF NOT EXISTS order_history (
  id TEXT PRIMARY KEY,
  subaccount_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  status TEXT NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  created_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(subaccount_id) REFERENCES nado_subaccounts(id),
  UNIQUE(subaccount_id, order_id)
);

CREATE TABLE IF NOT EXISTS match_history (
  id TEXT PRIMARY KEY,
  subaccount_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  order_id TEXT,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  matched_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(subaccount_id) REFERENCES nado_subaccounts(id),
  UNIQUE(subaccount_id, match_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_all_time (
  subaccount_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  total_pnl_usd REAL NOT NULL,
  total_volume_usd REAL NOT NULL,
  win_rate REAL NOT NULL,
  trades_count INTEGER NOT NULL,
  updated_at TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  FOREIGN KEY(subaccount_id) REFERENCES nado_subaccounts(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS public_scanner_cache (
  id TEXT PRIMARY KEY,
  subaccount_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  notional_usd REAL NOT NULL,
  happened_at TEXT NOT NULL,
  source_ref TEXT NOT NULL
);

CREATE VIEW IF NOT EXISTS leaderboard_ranked AS
SELECT
  row_number() OVER (ORDER BY total_pnl_usd DESC, total_volume_usd DESC) AS rank,
  subaccount_id,
  user_id,
  total_pnl_usd,
  total_volume_usd,
  win_rate,
  trades_count,
  updated_at,
  source_ref
FROM leaderboard_all_time;
