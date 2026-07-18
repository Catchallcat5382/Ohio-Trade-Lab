# Ohio Trade Lab V37

## Included fixes

- Images are shown in trade listings, auctioned items, highest bids, listing previews, and auction item search.
- Trade market filters: search, listing type, section, skin set, rarity, minimum/maximum value, sort, and images-only.
- Auction creation filters: preferred section, preferred set, and minimum bid value.
- Skin bidding wording now clearly explains that bids are in-game skins/items, not payments through the website.
- Highest-valued bid is shown. At expiration, the Worker automatically creates a private room for the owner and highest bidder.
- Auctions remain **delivery pending** until the owner confirms delivery. The owner can cancel a failed delivery and rerun the auction.
- Normal trade listings create a private room when accepted.
- Account-only Online Hub with Google sign-in or email/password accounts.
- Public display name plus visible `@account_username`; emails remain hidden from normal users.
- Browser notification button and an account control to turn website notification popups off.
- Larger top-left logo using `object-fit: contain`, without squishing or cropping.
- Server-side authorization for listings, bids, rooms, messages, delivery confirmation, account identity, and moderation. Editing the page with Inspect Element cannot grant server permissions.

## Important deployment requirement

The visual website works immediately, but real shared accounts and online data require the included Cloudflare Worker and D1 database. A static Pages site alone cannot securely provide accounts, private chats, auctions, or administrator records.

### 1. Create D1 and apply migrations

```bat
cd worker
wrangler d1 create ohio-trade-lab
```

Paste the returned database ID into `worker/wrangler.toml`, then run:

```bat
wrangler d1 migrations apply ohio-trade-lab --remote
```

### 2. Add secrets

```bat
wrangler secret put SESSION_SECRET
wrangler secret put ADMIN_KEY
```

Use long random values. Never place either secret in `index.html`, `config.js`, or GitHub.

### 3. Google login

Create a Google OAuth Web Client ID, add your production domain as an authorized JavaScript origin, and paste the client ID into both:

- `config.js`
- `worker/wrangler.toml` under `GOOGLE_CLIENT_ID`

Email/password login does not require Google configuration.

### 4. Deploy Worker

```bat
cd worker
wrangler deploy
```

Route `/api/*` on your website domain to this Worker, or put the Worker URL in `config.js` as `apiBase`.

## Privacy and moderation

- Visitor-facing API responses never include email addresses.
- The protected administrator endpoint is `GET /api/admin/users` and requires the `x-admin-key` header matching the `ADMIN_KEY` Worker secret.
- The backend filters common unsafe links, payment requests, credentials, login codes, threats, and personal-information requests.
- No automated filter is perfect. Add reporting, blocking, moderation review, retention limits, and a privacy policy before opening the service publicly.
- Do not claim anonymity to users. Explain what account and moderation data is stored and how long it is retained.
