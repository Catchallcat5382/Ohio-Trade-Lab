# Ohio Trade Lab V41 — Live Presence + Secure OAuth

## Cloudflare Pages build
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: leave blank
- D1 binding name: `DB`

Run every SQL migration in `worker/migrations` in numerical order. Migration `0004_discord_presence_sessions.sql` upgrades existing databases for Discord accounts and live presence.

## Required Cloudflare environment variables
Set these under **Workers & Pages → your project → Settings → Variables and Secrets**:

- `SESSION_SECRET`: a long random secret (at least 32 characters)
- `PUBLIC_SITE_URL`: your real site URL, for example `https://ohio-trade-lab.pages.dev`
- `GOOGLE_CLIENT_ID`: the public Google Web Client ID
- `DISCORD_CLIENT_ID`: Discord application client ID
- `DISCORD_CLIENT_SECRET`: Discord application client secret (mark encrypted)
- `OWNER_EMAILS`: comma-separated verified owner emails. Set this to `ilansheagoldstein@gmail.com`. A matching verified Google or Discord login is promoted to Developer on the server.

## Google setup
In Google Cloud Console create an OAuth 2.0 **Web application** client. Add both your Pages URL and custom domain under Authorized JavaScript origins. No secret is placed in `config.js`; the public client ID is loaded from `/api/auth/config`.

## Discord setup
In Discord Developer Portal → OAuth2 add this exact redirect URL:

`https://YOUR-DOMAIN/api/auth/discord/callback`

Use the same domain users open. The backend calculates this callback URL automatically. A failed OAuth attempt redirects back to the website with a readable error instead of a blank JSON page.

## Sessions and presence
Successful email, Google, and Discord logins set a `Secure`, `HttpOnly`, `SameSite=Lax` session cookie. A browser token remains supported for migration compatibility. Live presence counts active visitors from the previous 90 seconds as Guests, Users, or Staff and refreshes every 30 seconds.

Developer mode remains server-authorized by the account role in D1. Inspect Element cannot grant the role or access protected endpoints.


## V42 fixes
- Presence creates its own D1 table if migration 0005 was missed, so a guest heartbeat is counted immediately.
- The browser shows itself as one guest while the first server heartbeat is loading or if the API is temporarily unavailable.
- Verified owner bootstrap is server-side. Set `OWNER_EMAILS` to `ilansheagoldstein@gmail.com`; only a verified Google/Discord email match receives Developer. Inspect Element and localStorage cannot grant this role.
- Developer Mode can assign User or Staff roles from the protected account table. Role changes are checked by the server.
- Email/password registrations are not automatically promoted from OWNER_EMAILS because this build does not yet verify email ownership. Sign in with Google or Discord for the first owner bootstrap, or update the D1 role manually.

Run `worker/migrations/0005_presence_and_staff_roles.sql` after the earlier migrations.
