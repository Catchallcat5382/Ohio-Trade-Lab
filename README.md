# Ohio Trade Lab V22 — Cloudflare Pages

This build restores the classic V19 interface and includes the validated 640-item database.

## Upload to Cloudflare Pages

### Easiest: Direct Upload
1. Extract this ZIP.
2. Open Cloudflare Dashboard.
3. Go to **Workers & Pages**.
4. Click **Create application**.
5. Choose **Pages**.
6. Choose **Upload assets** / **Direct Upload**.
7. Drag the entire extracted folder contents into Cloudflare.
8. Deploy.

`index.html` must be at the top level beside `_headers`, `assets`, and `data`.

### GitHub method
Use:
- Framework preset: **None**
- Build command: leave blank
- Build output directory: `/`

## Important
Do not add a catch-all `_redirects` rule. This is a single static page and that rule previously caused a redirect loop.

The website includes the full database inside `index.html` as a fallback and also loads `data/items.json` when deployed. This prevents the old empty/invalid JSON error from taking down the site.
