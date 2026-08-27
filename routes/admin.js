const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { Posts, Admin } = require('../lib/store');
const { requireAdmin } = require('../middleware/auth');
const { upload, UPLOAD_ROOT } = require('../lib/upload');

const router = express.Router();

// Every admin view also loads admin.css for the top bar / table / form chrome.
router.use((req, res, next) => {
  res.locals.admin = true;
  next();
});

function flash(req, type, message) {
  req.session.flash = { type, message };
}

// Wraps multer so file-type / size errors show up as a normal flash
// message + redirect instead of crashing the request.
function handleUpload(req, res, next) {
  const mw = upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'attachments', maxCount: 8 },
  ]);
  mw(req, res, (err) => {
    if (err) {
      flash(req, 'error', err.message || 'That upload could not be processed.');
      return res.redirect(req.get('Referrer') || req.get('Referer') || '/admin/dashboard');
    }
    next();
  });
}

function fileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(size >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function toAttachments(files) {
  if (!files) return [];
  return files.map((f) => ({
    id: crypto.randomUUID(),
    originalName: f.originalname,
    filename: f.filename,
    size: fileSize(f.size),
    ext: path.extname(f.originalname).toLowerCase().replace('.', ''),
  }));
}

// ---- Auth ---------------------------------------------------------------

router.get('/', requireAdmin, (req, res) => res.redirect('/admin/dashboard'));

router.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin/dashboard');
  res.render('admin/login', { title: 'Admin Login', adminConfigured: Boolean(Admin.get()) });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = Admin.get();

  if (!admin) {
    flash(req, 'error', 'No admin account exists yet. Run "npm run setup" on the server first.');
    return res.redirect('/admin/login');
  }

  const ok = admin.username === username && bcrypt.compareSync(password || '', admin.passwordHash);
  if (!ok) {
    flash(req, 'error', 'Incorrect username or password.');
    return res.redirect('/admin/login');
  }

  req.session.isAdmin = true;
  req.session.adminUsername = admin.username;
  const dest = req.session.redirectTo || '/admin/dashboard';
  delete req.session.redirectTo;
  res.redirect(dest);
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---- Dashboard ------------------------------------------------------------

router.get('/dashboard', requireAdmin, (req, res) => {
  res.render('admin/dashboard', { title: 'Dashboard', posts: Posts.all() });
});

// ---- Create -----------------------------------------------------------

router.get('/posts/new', requireAdmin, (req, res) => {
  res.render('admin/post-form', { title: 'New Test Series', post: null });
});

router.post('/posts', requireAdmin, handleUpload, (req, res) => {
  const { title, category, description, duration, totalQuestions, totalMarks } = req.body;

  if (!title || !title.trim()) {
    flash(req, 'error', 'Title is required.');
    return res.redirect('/admin/posts/new');
  }

  const thumbFile = req.files && req.files.thumbnail && req.files.thumbnail[0];

  const post = Posts.create({
    title: title.trim(),
    category: (category || '').trim(),
    description: (description || '').trim(),
    duration: (duration || '').trim(),
    totalQuestions: (totalQuestions || '').trim(),
    totalMarks: (totalMarks || '').trim(),
    thumbnail: thumbFile ? thumbFile.filename : null,
    attachments: toAttachments(req.files && req.files.attachments),
    published: req.body.published === 'on',
  });

  flash(req, 'success', `"${post.title}" was published as ${post.code}.`);
  res.redirect('/admin/dashboard');
});

// ---- Edit -----------------------------------------------------------

router.get('/posts/:id/edit', requireAdmin, (req, res) => {
  const post = Posts.byId(req.params.id);
  if (!post) {
    flash(req, 'error', 'That test series could not be found.');
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/post-form', { title: `Edit - ${post.title}`, post });
});

router.post('/posts/:id', requireAdmin, handleUpload, (req, res) => {
  const post = Posts.byId(req.params.id);
  if (!post) {
    flash(req, 'error', 'That test series could not be found.');
    return res.redirect('/admin/dashboard');
  }

  const { title, category, description, duration, totalQuestions, totalMarks } = req.body;
  if (!title || !title.trim()) {
    flash(req, 'error', 'Title is required.');
    return res.redirect(`/admin/posts/${post.id}/edit`);
  }

  const thumbFile = req.files && req.files.thumbnail && req.files.thumbnail[0];
  const removeAttachmentIds = [].concat(req.body.removeAttachmentIds || []);

  if (thumbFile && post.thumbnail) {
    const oldPath = path.join(UPLOAD_ROOT, post.thumbnail);
    fs.unlink(oldPath, () => {});
  }

  if (removeAttachmentIds.length) {
    post.attachments
      .filter((a) => removeAttachmentIds.includes(a.id))
      .forEach((a) => fs.unlink(path.join(UPLOAD_ROOT, a.filename), () => {}));
  }

  Posts.update(post.id, {
    title: title.trim(),
    category: (category || '').trim(),
    description: (description || '').trim(),
    duration: (duration || '').trim(),
    totalQuestions: (totalQuestions || '').trim(),
    totalMarks: (totalMarks || '').trim(),
    published: req.body.published === 'on',
    thumbnail: thumbFile ? thumbFile.filename : undefined,
    newAttachments: toAttachments(req.files && req.files.attachments),
    removeAttachmentIds,
  });

  flash(req, 'success', `"${title.trim()}" was updated.`);
  res.redirect('/admin/dashboard');
});

// ---- Publish toggle / delete -------------------------------------------

router.post('/posts/:id/toggle', requireAdmin, (req, res) => {
  const post = Posts.byId(req.params.id);
  if (post) {
    Posts.setPublished(post.id, !post.published);
    flash(req, 'success', `"${post.title}" is now ${post.published ? 'hidden' : 'published'}.`);
  }
  res.redirect('/admin/dashboard');
});

router.post('/posts/:id/delete', requireAdmin, (req, res) => {
  const post = Posts.remove(req.params.id);
  if (post) {
    if (post.thumbnail) fs.unlink(path.join(UPLOAD_ROOT, post.thumbnail), () => {});
    post.attachments.forEach((a) => fs.unlink(path.join(UPLOAD_ROOT, a.filename), () => {}));
    flash(req, 'success', `"${post.title}" was deleted.`);
  }
  res.redirect('/admin/dashboard');
});

// ---- Settings (change username / password) ------------------------------

router.get('/settings', requireAdmin, (req, res) => {
  res.render('admin/settings', { title: 'Settings' });
});

router.post('/settings', requireAdmin, (req, res) => {
  const { username, currentPassword, newPassword, confirmPassword } = req.body;
  const admin = Admin.get();

  if (!bcrypt.compareSync(currentPassword || '', admin.passwordHash)) {
    flash(req, 'error', 'Current password is incorrect.');
    return res.redirect('/admin/settings');
  }

  if (!username || !username.trim()) {
    flash(req, 'error', 'Username cannot be empty.');
    return res.redirect('/admin/settings');
  }

  let passwordHash = admin.passwordHash;
  if (newPassword) {
    if (newPassword.length < 6) {
      flash(req, 'error', 'New password must be at least 6 characters.');
      return res.redirect('/admin/settings');
    }
    if (newPassword !== confirmPassword) {
      flash(req, 'error', "New passwords don't match.");
      return res.redirect('/admin/settings');
    }
    passwordHash = bcrypt.hashSync(newPassword, 10);
  }

  Admin.save({ username: username.trim(), passwordHash });
  req.session.adminUsername = username.trim();
  flash(req, 'success', 'Settings updated.');
  res.redirect('/admin/settings');
});

module.exports = router;
