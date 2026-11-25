# Update: customer login, order saving, My orders

## 1. Copy the files
Copy everything from this zip into your project folder and replace the files with the same names.
Do NOT replace your `config.js` (it holds your keys) and keep your `images` folder.
New files: `account.html`, `account.js`, `supa.js`, `orders-setup.sql`.

## 2. Add the orders table (Supabase)
1. Open `orders-setup.sql`, Find and Replace ALL `YOUR_ADMIN_EMAIL` with your admin email.
2. Supabase > SQL Editor > New query > paste > Run. It should say Success.

## 3. Let customers sign up
Supabase > Authentication > Sign In / Providers:
- Switch ON "Allow new users to sign up" (we switched it off earlier for the admin-only version).
- "Confirm email": ON is safer, but Supabase's built-in email sender allows only a few emails per hour, so for a real launch add your own email service (Authentication > SMTP Settings). For first tests you can switch it OFF.
Authentication > URL Configuration: set Site URL to your website address once it is live.

## 4. Test
1. Open `account.html`, sign up as a customer, then place a test order from `index.html`.
2. Open `account.html` again: the order shows under My orders.
3. Open `admin.html`: the order shows under Orders. Change its status; the customer sees the new status.

Your admin login still works only for the admin email. Customers can see only their own orders.
