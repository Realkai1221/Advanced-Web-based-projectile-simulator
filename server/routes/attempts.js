var express = require('express');
var router = express.Router();
var db = require('../database/db');
var { authenticate } = require('../middleware/auth');

// checks theyre enrolled and have done the prereqs before letting them attempt it
router.post('/', authenticate, (req, res) => {
  try {
    var { assignmentId, launchAngle, initialVelocity, missDistance, durationMs, isSuccess } = req.body;

    if (!assignmentId || launchAngle === undefined || initialVelocity === undefined) {
      return res.status(400).json({ error: 'assignmentId, launchAngle, and initialVelocity required' });
    }

    var assignment = db.prepare('SELECT class_id FROM Assignments WHERE assignment_id = ?').get(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // make sure the student is actually in this class
    var enrolment = db.prepare('SELECT 1 FROM Enrollments WHERE student_id = ? AND class_id = ?').get(req.userId, assignment.class_id);
    if (!enrolment) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }

    // check theyve completed all the prerequisite assignments first
    var prereqs = db.prepare('SELECT required_assignment_id FROM AssignmentPrereqs WHERE assignment_id = ?').all(assignmentId);

    for (var i = 0; i < prereqs.length; i++) {
      var completed = db.prepare(
        'SELECT 1 FROM Attempts WHERE user_id = ? AND assignment_id = ? AND is_success = 1'
      ).get(req.userId, prereqs[i].required_assignment_id);

      if (!completed) {
        return res.status(403).json({ error: 'Prerequisites not met' });
      }
    }

    db.prepare(
      'INSERT INTO Attempts (user_id, assignment_id, launch_angle, initial_velocity, miss_distance, duration_ms, is_success) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(req.userId, assignmentId, launchAngle, initialVelocity, missDistance || null, durationMs || null, isSuccess ? 1 : 0);

    res.status(201).json({ message: 'Attempt logged' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log attempt' });
  }
});

// teachers see everyones, students only see their own
router.get('/:assignmentId', authenticate, (req, res) => {
  try {
    var assignmentId = req.params.assignmentId;

    if (req.userRole === 'teacher') {
      var attempts = db.prepare(
        'SELECT at.*, u.username FROM Attempts at JOIN Users u ON at.user_id = u.user_id WHERE at.assignment_id = ? ORDER BY at.attempted_at DESC'
      ).all(assignmentId);
      res.json(attempts);
    } else {
      var attempts = db.prepare(
        'SELECT * FROM Attempts WHERE assignment_id = ? AND user_id = ? ORDER BY attempted_at DESC'
      ).all(assignmentId, req.userId);
      res.json(attempts);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch attempts' });
  }
});

module.exports = router;
