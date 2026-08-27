const express = require('express');
const { Posts } = require('../lib/store');

const router = express.Router();

router.get('/', (req, res) => {
  const category = req.query.category || '';
  let posts = Posts.published();
  const categories = Posts.categories();

  if (category) {
    posts = posts.filter((p) => p.category === category);
  }

  res.render('index', {
    title: 'Test Series',
    posts,
    categories,
    activeCategory: category,
  });
});

router.get('/test-series/:slug', (req, res) => {
  const post = Posts.bySlug(req.params.slug);
  if (!post || !post.published) {
    return res.status(404).render('404', { title: 'Not found' });
  }
  res.render('post', { title: post.title, post });
});

module.exports = router;
