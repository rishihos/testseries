// Simple file-based data store.
//
// This app is built for one admin managing a modest number of test series,
// so a JSON file on disk is enough - there's no separate database to install
// or configure. Every function here reads the file, does its work, and
// writes the file straight back out.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(POSTS_FILE)) fs.writeFileSync(POSTS_FILE, '[]\n');
}

function readPosts() {
  ensureDataFiles();
  const raw = fs.readFileSync(POSTS_FILE, 'utf8').trim();
  return raw ? JSON.parse(raw) : [];
}

function writePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2) + '\n');
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'test-series';
}

function uniqueSlug(title, posts, ignoreId) {
  const base = slugify(title);
  let slug = base;
  let n = 2;
  while (posts.some((p) => p.slug === slug && p.id !== ignoreId)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function nextCode(posts) {
  const year = new Date().getFullYear();
  const thisYear = posts.filter((p) => p.code && p.code.startsWith(`TS-${year}-`));
  let max = 0;
  thisYear.forEach((p) => {
    const n = parseInt(p.code.split('-')[2], 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `TS-${year}-${String(max + 1).padStart(3, '0')}`;
}

const Posts = {
  all() {
    return readPosts().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  published() {
    return Posts.all().filter((p) => p.published);
  },

  categories() {
    const set = new Set(Posts.published().map((p) => p.category).filter(Boolean));
    return Array.from(set);
  },

  bySlug(slug) {
    return readPosts().find((p) => p.slug === slug) || null;
  },

  byId(id) {
    return readPosts().find((p) => p.id === id) || null;
  },

  create(data) {
    const posts = readPosts();
    const now = new Date().toISOString();
    const post = {
      id: crypto.randomUUID(),
      code: nextCode(posts),
      slug: uniqueSlug(data.title, posts),
      title: data.title,
      category: data.category || 'Test Series',
      description: data.description || '',
      duration: data.duration || '',
      totalQuestions: data.totalQuestions || '',
      totalMarks: data.totalMarks || '',
      thumbnail: data.thumbnail || null,
      attachments: data.attachments || [],
      published: data.published !== false,
      createdAt: now,
      updatedAt: now,
    };
    posts.push(post);
    writePosts(posts);
    return post;
  },

  update(id, data) {
    const posts = readPosts();
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const existing = posts[idx];

    const updated = {
      ...existing,
      title: data.title !== undefined ? data.title : existing.title,
      category: data.category !== undefined ? data.category : existing.category,
      description: data.description !== undefined ? data.description : existing.description,
      duration: data.duration !== undefined ? data.duration : existing.duration,
      totalQuestions: data.totalQuestions !== undefined ? data.totalQuestions : existing.totalQuestions,
      totalMarks: data.totalMarks !== undefined ? data.totalMarks : existing.totalMarks,
      published: data.published !== undefined ? data.published : existing.published,
      updatedAt: new Date().toISOString(),
    };

    if (data.title && data.title !== existing.title) {
      updated.slug = uniqueSlug(data.title, posts, id);
    }
    if (data.thumbnail !== undefined) updated.thumbnail = data.thumbnail;
    if (data.newAttachments && data.newAttachments.length) {
      updated.attachments = [...existing.attachments, ...data.newAttachments];
    }
    if (data.removeAttachmentIds && data.removeAttachmentIds.length) {
      updated.attachments = updated.attachments.filter(
        (a) => !data.removeAttachmentIds.includes(a.id)
      );
    }

    posts[idx] = updated;
    writePosts(posts);
    return updated;
  },

  setPublished(id, published) {
    return Posts.update(id, { published });
  },

  remove(id) {
    const posts = readPosts();
    const post = posts.find((p) => p.id === id);
    const remaining = posts.filter((p) => p.id !== id);
    writePosts(remaining);
    return post || null;
  },
};

const Admin = {
  get() {
    ensureDataFiles();
    if (!fs.existsSync(ADMIN_FILE)) return null;
    const raw = fs.readFileSync(ADMIN_FILE, 'utf8').trim();
    return raw ? JSON.parse(raw) : null;
  },

  save({ username, passwordHash }) {
    ensureDataFiles();
    fs.writeFileSync(
      ADMIN_FILE,
      JSON.stringify({ username, passwordHash }, null, 2) + '\n'
    );
  },
};

module.exports = { Posts, Admin, slugify };
