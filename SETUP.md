# Petal & Stem: connect the admin panel (about 20 minutes)

Menu names in Supabase change now and then, so if a name differs slightly, look for the closest one.

## 1. Create the database
1. Sign up at supabase.com and click **New project**. Pick a name, set a database password (save it), and choose the region closest to you (Mumbai or Singapore).
2. Wait a minute until the project is ready.

## 2. Run the setup script
1. Open `supabase-setup.sql` in a text editor.
2. Find and replace `YOUR_ADMIN_EMAIL` with your own email (6 places). Keep the quotes.
3. In Supabase open **SQL Editor > New query**, paste the whole file and press **Run**. It should say "Success".

## 3. Create your admin login
1. Go to **Authentication > Users > Add user > Create new user**.
2. Enter the same email as in step 2 and a strong password. Tick **Auto Confirm User**.
3. In **Authentication** settings (Sign In / Providers), switch **off** "Allow new users to sign up", so nobody else can create accounts.

## 4. Connect the website
1. In Supabase open **Project Settings > API** (or the **Connect** button).
2. Copy the **Project URL** and the **anon public** key.
3. Paste them into `config.js` (`SUPABASE_URL` and `SUPABASE_ANON_KEY`). Never use the `service_role` key.

## 5. Try it
1. Open `index.html`. You should see the four starting bouquets (sample data replaces the built-in samples once connected).
2. Open `admin.html`, sign in, add a product with a photo, change a price, and refresh the shop page.

## 6. Publish
Upload the whole folder to Netlify (drag and drop) or Cloudflare Pages, then connect your domain.
Your admin page will be at `yourdomain.com/admin.html`. Only your login can change anything.

## Notes
- Test with a fake product first, then delete it.
- If the shop shows the built-in sample items instead of your products, check `config.js` and your internet connection.
- `images/cake1.jpg` to `cake5.jpg` are placeholder photos copied from another website and are only used if the database cannot be reached. Delete them before you launch and use your own photos.
