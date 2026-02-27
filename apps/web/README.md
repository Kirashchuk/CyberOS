# CyberOS Web (Next.js)

## Required env

- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app identifier.
- `NEXT_PUBLIC_API_BASE_URL` — backend API base URL (defaults to `http://localhost:8787`).

## Routes

- `/` landing
- `/waitlist` request-access
- `/auth` invite redeem + wallet connect
- `/dashboard` user/access status
- `/scanner`, `/leaderboard`, `/terminal`, `/copy` app sections
- `/admin` RBAC-gated admin tooling for approvals/referrals/audit
