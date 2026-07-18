# Ohio Trade Lab V40

## Cloudflare Pages build
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: leave blank

The Online Hub now contains its full sign-in UI and working controls. Email accounts work through the included `/api` Pages Function when D1 is bound. Google and Discord require OAuth credentials.

## Required Cloudflare bindings
1. Create a D1 database and bind it as `DB` to the Pages project.
2. Run `worker/migrations/0001_init.sql`, then `0002_secure_accounts_auctions.sql`.
3. Add secret `SESSION_SECRET`.
4. For Discord, add `DISCORD_CLIENT_ID`, secret `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, and `PUBLIC_SITE_URL`.
5. For Google, add `GOOGLE_CLIENT_ID` and put the same public client ID in `config.js`.

Never put Discord client secrets, session secrets, or administrator credentials in `config.js` or HTML.

Developer Mode is authorized by the database role, not by hidden HTML. Set only your account's `role` to `developer` using the example migration after replacing its email placeholder.
