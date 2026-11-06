SH MOD STOR — Supabase Free APK link version

কেন এই পরিবর্তন:
Supabase Free Storage-এর per-file limit-এর কারণে 116 MB APK সরাসরি সেখানে রাখা যাবে না। এই সংস্করণ APK-টি GitHub Releases-এ রাখে, আর Supabase-এ শুধু Download URL ও অ্যাপের তথ্য রাখে।

সেটআপ:
1) Supabase Dashboard > SQL Editor-এ supabase/free_apk_links_migration.sql একবার Run করুন।
2) index.html এবং app.js GitHub repository-তে পুরোনো ফাইলের জায়গায় Replace করে Commit করুন।
3) config.js-এ আপনার আগের Supabase Project URL এবং Publishable/anon key রাখুন। service_role/secret key কখনো ব্যবহার করবেন না।
4) GitHub repository-তে Releases > Create a new release-এ যান। Tag দিন (যেমন v1.0.0), 116 MB .apk ফাইলটি Attach করে Publish release করুন।
5) Release asset-এর Download link কপি করুন। সাধারণত লিংকটি এই রকম: https://github.com/OWNER/REPO/releases/download/TAG/FILENAME.apk
6) SH MOD STOR Admin Panel-এ APK Download Link ঘরে ওই HTTPS link paste করে অ্যাপ Save করুন।

নোট:
- GitHub Release asset প্রতি ফাইল 2 GiB-এর নিচে হতে হবে; 116 MB এর মধ্যে। GitHub-এর official docs: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
- GitHub repository-তে APK সাধারণ source file হিসেবে upload করবেন না; Release asset হিসেবে upload করবেন।
- APK অন্যের কপিরাইট/লাইসেন্স ভঙ্গ করে বা অননুমোদিত পরিবর্তিত অ্যাপ হলে তা বিতরণ করবেন না।
