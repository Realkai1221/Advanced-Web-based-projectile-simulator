var express = require('express');
var router = express.Router();
var db = require('../database/db');
var { hashPassword, comparePassword, generateToken } = require('../utils/hash');
var { authenticate } = require('../middleware/auth');

// registration 
router.post('/register', async (req, res) => {
  try {
    var { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // same regex as the client side validation
    if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters (letters, numbers, underscores)' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 6 || password.length > 64) {
      return res.status(400).json({ error: 'Password must be 6-64 characters' });
    }
    if (role !== 'teacher' && role !== 'student') {
      return res.status(400).json({ error: 'Role must be teacher or student' });
    }

    var existing = db.prepare('SELECT user_id FROM Users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    var hash = await hashPassword(password);
    db.prepare('INSERT INTO Users (username, email, password_hash, role) VALUES (?, ?, ?, ?)').run(username, email, hash, role);

    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    var { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    var user = db.prepare('SELECT user_id, password_hash, role FROM Users WHERE username = ?').get(username);

  
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    var match = await comparePassword(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    var token = generateToken(user.user_id);

    db.prepare("INSERT INTO Sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+24 hours'))").run(token, user.user_id);

    res.json({ token: token, userId: user.user_id, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', authenticate, (req, res) => {
  db.prepare('DELETE FROM Sessions WHERE token = ?').run(req.token);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
