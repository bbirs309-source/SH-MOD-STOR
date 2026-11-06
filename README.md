# SH MOD STOR

A responsive blue/black APK-store starter with Supabase database, public file downloads, and an admin-only upload panel.

## 1. Create Supabase project
1. Create a project at https://supabase.com.
2. Open **SQL Editor**, paste `supabase/schema.sql`, and run it.
3. In **Project Settings → API**, copy the Project URL and anon/public key.
4. Paste both into `config.js`. Never use the `service_role` key in browser code.

## 2. Create the first admin
1. In Supabase **Authentication → Users**, create an email/password user.
2. Copy that user's UUID.
3. In SQL Editor, run:
   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE_AUTH_USER_UUID_HERE');
   ```
4. Open the store, click **ADMIN PANEL**, and sign in with that email/password.

Only UUIDs explicitly inserted into `admin_users` are admins. Do not add a public insert policy to that table.

## 3. Publish the website
Upload the project files to a static host such as Netlify, Vercel, or Cloudflare Pages. No build step is needed. Keep `index.html`, `style.css`, `app.js`, `config.js`, `manifest.webmanifest`, and `sw.js` together; include the `supabase` folder for reference.

For a custom domain, connect it in your hosting provider's dashboard. HTTPS is required for installable PWA behavior.

## 4. Make it an Android app
This is a responsive installable web app starter, not a signed APK yet. Once hosted over HTTPS, Android Chrome can offer **Install app / Add to Home screen**. To publish a standalone APK, wrap the hosted site with a trusted Android packaging workflow (for example, a Trusted Web Activity) and sign the resulting Android package.

## Security notes
- The browser uses only the Supabase anon/public key. Never put the service-role key in `config.js`.
- Row Level Security and Storage policies restrict uploads and catalog changes to UUIDs in `admin_users`.
- Uploaded APK files are public by design, matching the requested public store.
- This starter limits uploads to 200 MB. Adjust the bucket limit and frontend validation together if needed.
- Review every APK before publishing. Public download links do not imply that files are safe.
