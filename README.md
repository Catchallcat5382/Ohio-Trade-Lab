Ohio Trade Lab V33 rarity correction

- There are zero Epic items.
- Confirmed Mythics remain Mythic.
- Every other item defaults to Legendary.

# Ohio Trade Lab V32

This build adds the eight-slot in-game trade layout, image-based match suggestions, and an Online Hub interface for public trades, item-for-item auctions, inbox notifications, and private trade rooms.

## Website deployment
Upload the project root to Cloudflare Pages. The catalog, calculator, inventory, and local demo Online Hub work immediately.

## Making the Online Hub shared between real visitors
The ZIP includes a Cloudflare Worker + D1 backend in `worker/`.

1. Install Wrangler: `npm install -g wrangler`
2. Log in: `wrangler login`
3. From `worker/`, create the database: `wrangler d1 create ohio-trade-lab`
4. Put the returned database ID into `worker/wrangler.toml`.
5. Apply the schema: `wrangler d1 migrations apply ohio-trade-lab --remote`
6. Deploy: `wrangler deploy`
7. Route `/api/*` from your site domain to that Worker, or deploy the Worker on the same domain using Cloudflare routes.

Without those deployment steps, Online Hub uses browser-local demo data. A static Pages ZIP alone cannot securely share listings or private chats across different users.

## Safety and privacy
The included filter blocks common shortened/invite links, password/login-code requests, and unsafe account-information requests. Display names, Roblox usernames, item names, gun names, and normal trade descriptions are allowed. This is a basic starter filter, not a substitute for moderation, account authentication, reporting, rate limits, or production security review.
