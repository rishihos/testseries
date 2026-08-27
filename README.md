# Test Series

A small Node.js + Express website for publishing a "test series" — mock tests,
previous year papers, and practice sets — with a built-in admin panel for
uploading and managing them. No external database is needed; everything is
stored in plain JSON files and an `uploads` folder.

## What's included

- **Public site** — a homepage that lists published test series (with
  category filtering) and a detail page for each one, where students can
  download the attached files (PDFs, images, etc.).
- **Admin panel** (`/admin`) — log in, then create, edit, publish/hide, and
  delete test series. Each one supports a thumbnail image, multiple file
  attachments, and basic exam info (duration, question count, marks).

## Requirements

- [Node.js](https://nodejs.org) version 18 or newer.

## Getting started

1. **Install dependencies**

   ```
   npm install
   ```

2. **Add your environment file**

   Copy `.env.example` to `.env`. The defaults work fine for local use; for a
   real deployment, change `SESSION_SECRET` to a long random string.

   ```
   cp .env.example .env
   ```

3. **Admin login**

   A default admin account is already set up so you can log in immediately:

   - **Username:** `admin`
   - **Password:** `TestSeries@123`

   Change this as soon as possible — either from **Admin → Settings** once
   logged in, or by running the setup script again:

   ```
   npm run setup
   ```

4. **Start the site**

   ```
   npm start
   ```

   Then open **http://localhost:3000** in your browser.
   The admin panel is at **http://localhost:3000/admin/login**.

## Folder structure

```
test-series/
├── server.js              Entry point
├── routes/                 Public site + admin routes
├── views/                  EJS templates
├── lib/                     Data store (JSON files) and file-upload config
├── middleware/            Admin-session middleware
├── data/
│   ├── posts.json          All test series (created/edited from the admin panel)
│   └── admin.json          Admin username + hashed password
├── public/
│   ├── css/, js/            Site styling and small scripts
│   └── uploads/              Uploaded thumbnails and attachments
└── scripts/setup-admin.js  CLI script to create/reset the admin login
```

## Notes

- Allowed attachment types: PDF, DOC, DOCX, JPG, PNG, WEBP (max 20MB per
  file, up to 8 files per test series).
- Uploaded files are stored on disk under `public/uploads/`. If you deploy
  this somewhere with an ephemeral filesystem (e.g. most free hosting tiers),
  uploads won't survive a restart — use a host with persistent disk storage,
  or adapt `lib/upload.js` to use cloud storage instead.
- Sessions are kept in memory by default, which is fine for a single-server
  setup. If you ever run more than one server instance behind a load
  balancer, swap in a persistent session store (e.g. `connect-sqlite3`).
