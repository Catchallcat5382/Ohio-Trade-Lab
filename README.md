# Ohio Trade Lab V38

## Fixed in this build

- Repaired Online Hub button behavior, including auction item searching.
- Trades, auctions, bids, private rooms, delivery confirmations, reruns, and removals now persist in local browser storage when the backend is not deployed.
- Expired local auctions automatically select the highest-valued valid item bid, create a private room, and remain delivery-pending until the owner confirms delivery.
- Added a real server-authorized Developer Mode dashboard for account moderation and listing removal.
- Developer Mode is never enabled by HTML, CSS, localStorage, or Inspect Element. The Worker checks the authenticated account role on every developer endpoint.
- Normal users cannot retrieve account emails. Emails appear only in the developer endpoint after server-side authorization.

## Important: shared saving requires the backend

Local mode saves only in the current browser. To save across users/devices and provide real shared auctions, deploy the included Cloudflare Worker and D1 database.

### Deploy/update

```bat
cd worker
wrangler d1 migrations apply ohio-trade-lab --remote
wrangler secret put SESSION_SECRET
wrangler deploy
```

### Give only your account Developer Mode

1. Create your account normally on the deployed site.
2. Open `worker/migrations/0003_developer_role.sql`.
3. Replace `REPLACE_WITH_YOUR_EMAIL@example.com` with the exact email used by your account.
4. Apply it:

```bat
wrangler d1 execute ohio-trade-lab --remote --file=migrations/0003_developer_role.sql
```

Do not put an admin password, secret key, or your email check inside `index.html` or `config.js`. Client-side checks can be changed with Inspect Element. V38 uses the authenticated role stored in D1 and rechecks it in the Worker.
