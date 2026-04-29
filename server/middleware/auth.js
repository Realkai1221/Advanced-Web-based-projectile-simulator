var db = require('../database/db');

function authenticate(req, res, next) {
  var authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  var token = authHeader.split(' ')[1];

  var session = db.prepare(
    "SELECT s.user_id, u.role FROM Sessions s JOIN Users u ON s.user_id = u.user_id WHERE s.token = ? AND s.expires_at > datetime('now')"
  ).get(token);

  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.userId = session.user_id;
  req.userRole = session.role;
  req.token = token;
  next();
}

module.exports = { authenticate };
