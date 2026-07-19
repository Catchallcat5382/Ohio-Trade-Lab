# Ohio Trade Lab V59

# Ohio Trade Lab V57

# Ohio Trade Lab V55

V55 fixes OAuth/session restoration, private email reveal controls, immediate account refresh, multi-item auction validation, owned-item bid enforcement, inventory synchronization after completion, profile restoration, presence handling, and safer developer tools with explicit email reveal and user lookup.

# Ohio Trade Lab V54

## V54 changes

- Trades and auctions reload into the market immediately after posting.
- Posting forms clear and return to the market automatically.
- Auctions support up to eight owned items.
- Auctions require a starting value of at least 1 and limit it to about 15% above the selected items’ combined catalog value.
- Optional buyout items can be selected from inventory.
- Profile display name, secure HTTPS profile image URL, and public bio are editable.
- Inventory is synchronized with D1 before listings are created.
- Completing an auction or accepted trade removes the exchanged items from the corresponding server inventory for convenience.
- Developer overview includes online/offline accounts, profiles, listings, rooms, and moderated room messages.
- Developer data now requires a separate `ADMIN_ACCESS_CODE` Cloudflare secret in addition to a developer account. Do not use your Windows PIN.
- Logout and session checks close the developer panel and update the visible signed-in state.

## Required Cloudflare secret

Add a secret named `ADMIN_ACCESS_CODE` containing a strong, separate access code. This must not be the same as your Windows PIN, Google password, or Discord password.

## Database

The Worker automatically applies missing V54 columns and creates `user_inventory`. The included migration is `worker/migrations/0006_v54_market_profiles_inventory_admin.sql`. Existing databases may report duplicate-column messages if you manually run a migration after the Worker has already upgraded the schema.

# Ohio Trade Lab V52

V52 requires a confirmed server session before any Online Hub market, trade, auction, inbox, or room content is displayed. It also replaces the item-card-only selectors with clear category and item dropdowns, image/value previews, and add/remove controls for trade items.

# Ohio Trade Lab V51

V51 adds direct image item pickers for Post Trade and Auctions, fixes account display-name saving, and blocks guest access to posting, auction creation, inbox, bidding, accepting, and account management. Public market browsing remains available.

Cloudflare requirements remain unchanged: D1 binding named `DB` plus the OAuth/session environment variables.

# Ohio Trade Lab V50

V50 fixes the split authentication state that caused the header to show a signed-in user while Account, posting, auctions, and inbox still treated the same browser as logged out.

## Fixes
- One server-cookie session is used across the whole Online Hub.
- The original hub state and the newer account header are synchronized.
- Account opens correctly for authenticated users.
- Post Trade, Auctions, Inbox, rooms, and action buttons recognize the same signed-in user.
- Logout clears the server cookie and all legacy browser login state.
- Sessions use the existing 30-day secure cookie and survive tab/browser closure.
- Guest browsing remains available for the trade market and auctions.

Keep the Cloudflare D1 binding named `DB` and the existing Production secrets.

# Ohio Trade Lab V48

V48 fixes stale Developer UI state. The server session is now the source of truth, the developer panel always starts closed, logout removes legacy browser login state, and the button is labeled **Open Developer Tools** so having the Developer role is not confused with currently being inside a mode.

# Ohio Trade Lab V46

This build automatically creates the required D1 tables on the first API request. It fixes `D1_ERROR: no such table: users` and also creates the listings, bids, rooms, messages, notifications, and presence tables without deleting existing data.

You still need a Cloudflare D1 binding named exactly `DB`. After deploying, open `/api/health`, then try Google or Discord sign-in again.

# Ohio Trade Lab V45 — OAuth Environment Diagnostics Fix

This build removes the misleading browser-side “not configured” block. Google and Discord buttons now always reach the server, which returns the real configuration result.

## New diagnostic URL

After deploying Production, open:

`https://ohio-trade-lab.pages.dev/api/auth/diagnostics`

It safely returns only variable names and true/false presence flags. It never returns secret values. All four OAuth flags must be true:

- `googleClientId`
- `googleClientSecret`
- `discordClientId`
- `discordClientSecret`

`databaseBound` must also be true.

If the variables appear in the Cloudflare dashboard but their flags are false, they are attached to a different environment/project than the Production deployment. In Cloudflare Pages, add them to the Ohio Trade Lab **Production** environment and create a new production deployment.

## Required Production bindings

Variables or secrets:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `PUBLIC_SITE_URL=https://ohio-trade-lab.pages.dev`
- `SESSION_SECRET`
- `OWNER_EMAILS`

D1 binding:
- Variable name: `DB`
- Database: your created Ohio Trade Lab D1 database

## OAuth callbacks

Google: `https://ohio-trade-lab.pages.dev/api/auth/google/callback`

Discord: `https://ohio-trade-lab.pages.dev/api/auth/discord/callback`

## Security

Client secrets and session secrets remain server-only. The diagnostics endpoint reveals names/presence only.

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


## V47 fixes
- OAuth cookie sessions now restore visibly after Google/Discord callbacks.
- Logout clears both the server HttpOnly cookie and browser fallback token.
- Guests can browse the trade market and auctions but cannot post, bid, accept, use rooms, or see account controls.
- Notification preference buttons now update and persist correctly.
- Discord links verified accounts by email and returns useful callback errors.
- Profile edits now update the visible account immediately.

## V65.1 push-detection rebuild

This archive contains unique source changes compared with V65. The site exposes build `65.1.0` in `index.html`, the package version is updated, and `push.bat` prints the exact staged files before committing. Copy the contents of this archive into the root of the existing Git repository, replacing matching files, then run `push.bat`.
