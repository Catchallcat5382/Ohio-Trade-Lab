# Ohio Trade Lab V39

This package fixes the broken Online Hub auction-search event handler and adds a dependency-free Cloudflare Pages build.

## Cloudflare Pages settings

- Framework preset: **None**
- Build command: **npm run build**
- Build output directory: **dist**
- Root directory: leave blank

The public site and browser-local saving work without backend credentials.

## Shared online accounts and saving

The `worker` folder is an optional backend source template. It requires your own Cloudflare D1 database ID, session secret, and Google OAuth client ID. Those private deployment values cannot safely be prefilled into a public ZIP.

Do not deploy `worker/wrangler.example.toml` without copying it to `worker/wrangler.toml` and replacing its documented values.
