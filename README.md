# Ohio Trade Lab V44 — D1 Binding Diagnostics Fix

This build prevents the confusing `Cannot read properties of undefined (reading 'prepare')` crash. That message means Cloudflare did not inject a D1 database as `env.DB`. The site now reports a clear `Database not configured` message and `/api/health` shows whether the binding exists.

## REQUIRED Cloudflare fix

1. Cloudflare Dashboard → Workers & Pages → Ohio Trade Lab.
2. Settings → Bindings.
3. Add → D1 database binding.
4. Variable name: `DB` (uppercase, exactly).
5. Select or create your Ohio Trade Lab D1 database.
6. Add the binding to Production. Add it to Preview too if you test preview deployments.
7. Redeploy after saving.
8. Open `/api/health`; it must report `"databaseBound": true`.
9. Apply every SQL file under `worker/migrations` in order to that same D1 database.

Do not create `DB` as a text environment variable. It must be a **D1 database binding**.

---

# Ohio Trade Lab V43 — Redirect OAuth Fix

This build replaces the blocked Google One Tap prompt with the normal Google OAuth account chooser. Google and Discord callbacks are generated from `PUBLIC_SITE_URL`, so the app no longer uses a placeholder domain or a changing preview deployment URL.

## Required Cloudflare Production variables

Open **Cloudflare Dashboard → Workers & Pages → Ohio Trade Lab → Settings → Variables and Secrets**. Add these under **Production**:

### Plain variables

- `PUBLIC_SITE_URL` = `https://ohio-trade-lab.pages.dev`
- `GOOGLE_CLIENT_ID` = the Google OAuth Web application client ID
- `DISCORD_CLIENT_ID` = the Discord Application ID
- `OWNER_EMAILS` = `ilansheagoldstein@gmail.com`

### Encrypted secrets

- `GOOGLE_CLIENT_SECRET` = the secret from the same Google OAuth Web client
- `DISCORD_CLIENT_SECRET` = the Discord OAuth2 client secret
- `SESSION_SECRET` = a random 32–64+ character value

Do not put quotes around the values. After saving them, create a new production deployment.

## Google Cloud settings

For the OAuth client, application type must be **Web application**.

Authorized JavaScript origin:

`https://ohio-trade-lab.pages.dev`

Authorized redirect URI:

`https://ohio-trade-lab.pages.dev/api/auth/google/callback`

The redirect URI must match exactly. Do not add a trailing slash.

## Discord Developer Portal settings

In **OAuth2 → Redirects**, add:

`https://ohio-trade-lab.pages.dev/api/auth/discord/callback`

Save changes. Copy the Application ID into `DISCORD_CLIENT_ID`, and save the client secret as the encrypted `DISCORD_CLIENT_SECRET` in Cloudflare.

## D1 binding

Your D1 database binding must be named exactly:

`DB`

Apply all SQL files in `worker/migrations` in numerical order if they have not already been applied.

## What was fixed

- Normal Google redirect login instead of the browser-blocked One Tap prompt.
- Server-side Google authorization-code exchange.
- Secure OAuth state and nonce cookies.
- Secure 30-day `HttpOnly` session cookie.
- OAuth callbacks always use `PUBLIC_SITE_URL`.
- Discord no longer redirects to `your-actual-domain.com`.
- Existing accounts can be matched by verified email.
- The verified owner email is promoted to developer only on the server.
- Emails and provider IDs remain private and are not exposed in public profiles.
- Invalid `_redirects` loop rule removed.

## Testing

After redeploying, open the production site—not a preview deployment—and visit:

- `/api/health` → should show `{ "ok": true }`
- `/api/auth/config` → should show `googleEnabled: true` and `discordEnabled: true`

Then click the Google or Discord button.
