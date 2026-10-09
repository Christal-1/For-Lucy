# Handmade With Love by Lucy

A fresh, responsive bakery website with a soft pink, floral style, a product catalogue, private owner dashboard, image uploads, and regular WhatsApp click-to-chat ordering. Built from scratch with Node.js and Express. No Supabase and no WhatsApp Business Platform.

## Requirements

- Node.js 20 or newer (your existing Node.js v24 installation is suitable)
- npm (included with Node.js)

## First-time setup on Windows

1. Extract this folder somewhere convenient, for example `C:\Projects\handmade-with-love-lucy`.
2. Open the folder in File Explorer.
3. Click the address bar, type `powershell`, and press Enter.
4. Install dependencies:

   ```powershell
   npm install
   ```

5. Create your private owner login and local configuration:

   ```powershell
   npm run setup
   ```

   Follow the prompts. Choose a unique password of at least 12 characters. Setup creates a local `.env` file containing a password hash and a randomly generated session secret. Do not send anyone your `.env` file or password.

6. Start the website:

   ```powershell
   npm start
   ```

7. Open these addresses in your browser:
   - Customer website: <http://localhost:3000>
   - Owner dashboard: <http://localhost:3000/admin.html>
   - Health check: <http://localhost:3000/health>

Keep the PowerShell window open while using the site. Press `Ctrl+C` in that window to stop the server.

## Add and manage products

1. Open `/admin.html` and sign in using the username and password you chose during setup.
2. Fill in the product name, category, price in South African rand, and description.
3. Optionally upload a JPG, PNG, WEBP, or GIF image up to 5 MB.
4. Select whether the product should appear on the public catalogue and save.
5. Use **Edit** to change a product or **Delete** to remove it. Deleting is permanent for that product.

Product data is stored locally in `storage/products.json`; uploaded images are stored in `uploads/`. Back up both folders regularly. Do not delete or share `.env`.

## WhatsApp orders

The default South African number is `0712677342`. Setup asks for the number and stores it in international format in `.env`. The public website uses regular WhatsApp click-to-chat links. A customer selects **Order this**, reviews the prepared message, and opens WhatsApp to send it. The website does not send messages automatically, and the customer must press Send in WhatsApp.

If you need to change the number later, stop the server, edit `WHATSAPP_NUMBER` in `.env` to digits in international format (for example `27712677342`), and restart the server.

## Security notes

- Product create/update/delete routes require an authenticated session on the server; hiding dashboard controls is not the security boundary.
- Passwords are stored as bcrypt hashes, not plaintext.
- Login attempts are rate-limited; sessions use HTTP-only and SameSite cookies; write actions require a session CSRF token.
- `.env`, the product data file and uploaded images are excluded from Git by `.gitignore`.
- This is ready for local development. Before public deployment, use HTTPS, set `NODE_ENV=production`, configure Express `trust proxy` for the actual hosting environment, use a persistent session store instead of Express's in-memory store, set up backups, and review hosting/storage limits. Do not expose the local development server directly to the internet.

## Useful commands

```powershell
npm start       # Start the site
npm run dev     # Restart the server automatically while developing
```

If the sign-in configuration needs to be reset, stop the server, securely back up any data you need, delete `.env`, then run `npm run setup` again. This creates a new session secret and owner credentials; it does not delete your product catalogue.
