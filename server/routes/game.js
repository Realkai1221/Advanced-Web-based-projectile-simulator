var express = require('express');
var router = express.Router();
var db = require('../database/db');
var { authenticate } = require('../middleware/auth');
var { mergeSort } = require('../utils/mergeSort');

// creates a game session 
router.post('/create', authenticate, (req, res) => {
  try {
    var { player1Id, player2Id } = req.body;
    if (!player1Id || !player2Id) {
      return res.status(400).json({ error: 'Both player IDs required' });
    }

    db.prepare('INSERT INTO GameSessions (player1_id, player2_id) VALUES (?, ?)').run(player1Id, player2Id);

    // couldnt figure out how to get last_insert_rowid with sql.js wrapper so I just query for the most recent session with these players
    var session = db.prepare(
      'SELECT session_id FROM GameSessions WHERE player1_id = ? AND player2_id = ? ORDER BY session_id DESC'
    ).get(player1Id, player2Id);

    res.status(201).json({ sessionId: session.session_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create game session' });
  }
});

// save the game result when someone wins
router.post('/result', authenticate, (req, res) => {
  try {
    var { sessionId, winnerId, players } = req.body;
    if (!sessionId || !winnerId || !players || players.length === 0) {
      return res.status(400).json({ error: 'sessionId, winnerId, and players required' });
    }

    db.prepare("UPDATE GameSessions SET winner_id = ?, ended_at = datetime('now') WHERE session_id = ?").run(winnerId, sessionId);

    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      db.prepare(
        'INSERT INTO LeaderboardEntries (user_id, session_id, wins, total_shots, total_miss_distance, fastest_hit_ms) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(p.userId, sessionId, p.wins, p.totalShots, p.totalMissDistance, p.fastestHitMs);
    }

    res.json({ message: 'Game result saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save game result' });
  }
});

// leaderboard 
router.get('/leaderboard', authenticate, (req, res) => {
  try {
    var entries = db.prepare(
      "SELECT u.username, u.user_id, SUM(le.wins) AS wins, SUM(le.total_shots) AS totalShots, " +
      "CASE WHEN SUM(le.total_shots) > 0 THEN SUM(le.total_miss_distance) / SUM(le.total_shots) ELSE 0 END AS avgAccuracy, " +
      "MIN(le.fastest_hit_ms) AS fastestTime " +
      "FROM LeaderboardEntries le JOIN Users u ON le.user_id = u.user_id GROUP BY le.user_id"
    ).all();

    var sorted = mergeSort(entries);
    res.json(sorted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
