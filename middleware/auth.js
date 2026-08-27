function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  req.session.redirectTo = req.originalUrl;
  return res.redirect('/admin/login');
}

// Makes flash messages and the logged-in state available to every view
// without repeating res.locals in each route.
function exposeLocals(req, res, next) {
  res.locals.isAdmin = Boolean(req.session && req.session.isAdmin);
  res.locals.adminUsername = (req.session && req.session.adminUsername) || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}

module.exports = { requireAdmin, exposeLocals };
