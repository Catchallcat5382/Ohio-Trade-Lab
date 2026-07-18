# Ohio Trade Lab — Cloudflare Pages project

This folder is ready for a free Cloudflare Pages deployment.

## Included features
- Searchable value database generated from `Official Obscure's Values.xlsx`
- Fair trade calculator with your side and their side
- Value-gap item recommendations
- Inventory saving and inventory analysis
- Inventory export/import
- Browser-saved trade listings
- Mobile layout
- No build tools or paid hosting required

## Accuracy rules
- The website uses the uploaded official workbook as its primary source.
- Exact duplicate names are merged.
- Tiny duplicate value differences are averaged.
- Large conflicts are not averaged automatically.
- Unknown values are not invented.

## Free website address
Cloudflare Pages gives the site a free address similar to:

`your-project-name.pages.dev`

That is a real free subdomain. You do not need to buy a `.com`.

## GitHub upload using only your browser
1. Sign in to GitHub.
2. Click the **+** button in the top-right, then **New repository**.
3. Name it `ohio-trade-lab`.
4. Choose **Public** or **Private**.
5. Create the repository.
6. Extract the ZIP from ChatGPT on your computer.
7. Open the extracted `OhioTradeLab_Cloudflare` folder.
8. On the GitHub repository page, click **Add file → Upload files**.
9. Drag everything *inside* the folder into GitHub:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
   - `data` folder
   - `supabase` folder
   - `_headers`
   - `_redirects`
   - `README.md`
10. Enter a commit message such as `Initial Ohio Trade Lab website`.
11. Choose **Commit directly to the main branch** and click **Commit changes**.

Important: `index.html` must be at the top level of the repository, not inside another folder.

## Connect GitHub to Cloudflare Pages
1. Sign in to Cloudflare.
2. Open **Workers & Pages**.
3. Choose **Create application → Pages → Connect to Git**.
4. Connect GitHub and authorize access to your repository.
5. Select `ohio-trade-lab`.
6. Use:
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: leave blank
   - Build output directory: `/`
7. Click **Save and Deploy**.
8. Cloudflare will give you a free `*.pages.dev` website address.

Every later GitHub commit automatically redeploys the website.

## Updating the site later
Replace the changed files on GitHub and commit them. Cloudflare will redeploy automatically.

## Public trade listings
The included version keeps listings in each visitor's browser because a static website cannot share data between users by itself.

The `supabase/schema.sql` file is included for a later public marketplace. You would:
1. Create a Supabase project.
2. Run `supabase/schema.sql` in its SQL editor.
3. Add the project's public URL and anon key to `config.js`.
4. Add Supabase client code to `app.js`.

Do not place private service keys or passwords in GitHub. Only a public anon key belongs in frontend code.
