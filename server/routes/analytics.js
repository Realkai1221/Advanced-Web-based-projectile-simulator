var express = require('express');
var router = express.Router();
var db = require('../database/db');
var { authenticate } = require('../middleware/auth');

// this took the longest to write because of the subqueries had to figure out how to only count attempts before the first success
router.get('/:classId', authenticate, (req, res) => {
  if (req.userRole !== 'teacher') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const classId = req.params.classId;

    const classInfo = db.prepare(
      'SELECT 1 FROM Classes WHERE class_id = ? AND teacher_id = ?'
    ).get(classId, req.userId);

    if (!classInfo) {
      return res.status(403).json({ error: 'Not your class' });
    }

    const studentCount = db.prepare(
      'SELECT COUNT(DISTINCT student_id) AS count FROM Enrollments WHERE class_id = ?'
    ).get(classId);

    // Only count attempts before each student's first success per assignment
    const overallStats = db.prepare(`
      SELECT
        COUNT(*) AS totalAttempts,
        SUM(is_success) AS totalSuccesses,
        AVG(miss_distance) AS avgMissDistance
      FROM Attempts at
      JOIN Assignments a ON at.assignment_id = a.assignment_id
      WHERE a.class_id = ?
        AND at.attempt_id <= COALESCE(
          (SELECT MIN(at2.attempt_id) FROM Attempts at2
           WHERE at2.user_id = at.user_id AND at2.assignment_id = at.assignment_id AND at2.is_success = 1),
          at.attempt_id
        )
    `).get(classId);

    const totalAssignments = db.prepare(
      'SELECT COUNT(*) AS count FROM Assignments WHERE class_id = ?'
    ).get(classId);

    // Completion rate calculation 
    const completions = db.prepare(`
      SELECT COUNT(DISTINCT at.user_id || '-' || at.assignment_id) AS count
      FROM Attempts at
      JOIN Assignments a ON at.assignment_id = a.assignment_id
      WHERE a.class_id = ? AND at.is_success = 1
    `).get(classId);

    const maxCompletions = (studentCount.count || 1) * (totalAssignments.count || 1);
    const completionRate = maxCompletions > 0 ? (completions.count / maxCompletions * 100) : 0;

    // Per-assignment breakdown (only pre-completion attempts)
    const perAssignment = db.prepare(`
      SELECT
        a.assignment_id,
        a.name,
        COUNT(at.attempt_id) AS attemptCount,
        SUM(CASE WHEN at.is_success = 1 THEN 1 ELSE 0 END) AS successCount,
        AVG(at.miss_distance) AS avgMissDistance
      FROM Assignments a
      LEFT JOIN Attempts at ON a.assignment_id = at.assignment_id
        AND at.attempt_id <= COALESCE(
          (SELECT MIN(at2.attempt_id) FROM Attempts at2
           WHERE at2.user_id = at.user_id AND at2.assignment_id = at.assignment_id AND at2.is_success = 1),
          at.attempt_id
        )
      WHERE a.class_id = ?
      GROUP BY a.assignment_id
      ORDER BY a.assignment_id
    `).all(classId);

    // Per-student summary with completion count
    const perStudent = db.prepare(`
      SELECT
        u.user_id,
        u.username,
        COUNT(at.attempt_id) AS attemptCount,
        SUM(CASE WHEN at.is_success = 1 THEN 1 ELSE 0 END) AS successCount,
        AVG(at.miss_distance) AS avgMissDistance,
        (SELECT COUNT(DISTINCT at3.assignment_id) FROM Attempts at3
         JOIN Assignments a3 ON at3.assignment_id = a3.assignment_id
         WHERE at3.user_id = u.user_id AND a3.class_id = ? AND at3.is_success = 1
        ) AS completedAssignments
      FROM Enrollments e
      JOIN Users u ON e.student_id = u.user_id
      LEFT JOIN Attempts at ON at.user_id = u.user_id
        AND at.assignment_id IN (SELECT assignment_id FROM Assignments WHERE class_id = ?)
      WHERE e.class_id = ?
      GROUP BY u.user_id
      ORDER BY u.username
    `).all(classId, classId, classId);

    // Flagged studnets if needed 
    const flagged = db.prepare(`
      SELECT
        u.username,
        u.user_id,
        COUNT(at.attempt_id) AS attempts,
        SUM(at.is_success) AS successes
      FROM Attempts at
      JOIN Users u ON at.user_id = u.user_id
      JOIN Assignments a ON at.assignment_id = a.assignment_id
      WHERE a.class_id = ?
      GROUP BY at.user_id
      HAVING attempts > 5 AND successes = 0
    `).all(classId);

    res.json({
      summary: {
        totalStudents: studentCount.count,
        totalAttempts: overallStats.totalAttempts,
        avgMissDistance: overallStats.avgMissDistance || 0,
        completionRate: Math.round(completionRate * 10) / 10,
        flaggedCount: flagged.length,
        totalAssignments: totalAssignments.count
      },
      perAssignment,
      perStudent,
      flagged
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/student/:id and individual student detail
router.get('/student/:id', authenticate, (req, res) => {
  if (req.userRole !== 'teacher') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const studentId = req.params.id;
    const classId = req.query.classId;

    const student = db.prepare(
      'SELECT user_id, username, email FROM Users WHERE user_id = ? AND role = ?'
    ).get(studentId, 'student');

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const attempts = db.prepare(`
      SELECT
        at.*,
        a.name AS assignmentName,
        a.class_id
      FROM Attempts at
      JOIN Assignments a ON at.assignment_id = a.assignment_id
      WHERE at.user_id = ? AND a.class_id = ?
      ORDER BY at.attempted_at DESC
    `).all(studentId, classId);

    // Stats only from pre-completion attempts
    const stats = db.prepare(`
      SELECT
        COUNT(*) AS totalAttempts,
        SUM(is_success) AS successes,
        AVG(miss_distance) AS avgMissDistance,
        MIN(miss_distance) AS bestMissDistance
      FROM Attempts at
      JOIN Assignments a ON at.assignment_id = a.assignment_id
      WHERE at.user_id = ? AND a.class_id = ?
        AND at.attempt_id <= COALESCE(
          (SELECT MIN(at2.attempt_id) FROM Attempts at2
           WHERE at2.user_id = at.user_id AND at2.assignment_id = at.assignment_id AND at2.is_success = 1),
          at.attempt_id
        )
    `).get(studentId, classId);

    res.json({
      student,
      stats,
      attempts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch student analytics' });
  }
});

module.exports = router;
