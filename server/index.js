var express = require('express');
var path = require('path');
var db = require('./database/db');

var app = express();
var PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/attempts', require('./routes/attempts'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/game', require('./routes/game'));
app.use('/api', require('./routes/game'));

app.get('/api/health', (req, res) => {
  var count = db.prepare('SELECT COUNT(*) AS count FROM Users').get();
  res.json({ status: 'ok', users: count.count });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

async function start() {
  await db.init();
  app.listen(PORT, () => {
    console.log('NEA Projectile Simulator running on http://localhost:' + PORT);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
