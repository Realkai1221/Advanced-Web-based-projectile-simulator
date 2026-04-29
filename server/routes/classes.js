var express = require('express');
var router = express.Router();
var db = require('../database/db');
var { authenticate } = require('../middleware/auth');

// makes a random code for students to join with
function generateJoinCode() {
  var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  code += letters[Math.floor(Math.random() * 26)];
  code += letters[Math.floor(Math.random() * 26)];
  code += String(Math.floor(1000 + Math.random() * 9000));
  return code;
}

// teacher gets their list of classes
router.get('/', authenticate, (req, res) => {
  if (req.userRole !== 'teacher') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const classes = db.prepare(
      'SELECT * FROM Classes WHERE teacher_id = ? ORDER BY created_at DESC'
    ).all(req.userId);

    // Attach student count to each class
    for (const c of classes) {
      const count = db.prepare(
        'SELECT COUNT(*) AS count FROM Enrollments WHERE class_id = ?'
      ).get(c.class_id);
      c.studentCount = count ? count.count : 0;
    }

    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

// student sees what classes theyve joined
router.get('/enrolled', authenticate, (req, res) => {
  try {
    const classes = db.prepare(`
      SELECT c.class_id, c.class_name, c.semester, c.join_code
      FROM Enrollments e
      JOIN Classes c ON e.class_id = c.class_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC
    `).all(req.userId);

    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch enrolled classes' });
  }
});

// single class with its students
router.get('/:id', authenticate, (req, res) => {
  if (req.userRole !== 'teacher') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const classInfo = db.prepare(
      'SELECT * FROM Classes WHERE class_id = ? AND teacher_id = ?'
    ).get(req.params.id, req.userId);

    if (!classInfo) {
      return res.status(404).json({ error: 'Class not found' });
    }

    const students = db.prepare(`
      SELECT u.user_id, u.username, u.email, e.enrolled_at
      FROM Enrollments e
      JOIN Users u ON e.student_id = u.user_id
      WHERE e.class_id = ?
    `).all(req.params.id);

    res.json({ ...classInfo, students });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch class' });
  }
});

// create a new class
router.post('/', authenticate, (req, res) => {
  if (req.userRole !== 'teacher') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { className, semester } = req.body;

  // Validate class name
  if (!className || !/^[A-Za-z0-9 _-]{3,50}$/.test(className)) {
    return res.status(400).json({ error: 'Class name must be 3-50 characters' });
  }

  try {
    // Generate unique join code
    let joinCode;
    let attempts = 0;
    do {
      joinCode = generateJoinCode();
      const existing = db.prepare('SELECT 1 FROM Classes WHERE join_code = ?').get(joinCode);
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    db.prepare(
      'INSERT INTO Classes (teacher_id, class_name, join_code, semester) VALUES (?, ?, ?, ?)'
    ).run(req.userId, className, joinCode, semester || null);

    const created = db.prepare(
      'SELECT * FROM Classes WHERE join_code = ?'
    ).get(joinCode);

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// student joins a class using the code their teacher gave them
router.post('/:id/enrol', authenticate, (req, res) => {
  try {
    const { joinCode } = req.body;

    if (!joinCode) {
      return res.status(400).json({ error: 'Join code required' });
    }

    const classInfo = db.prepare(
      'SELECT * FROM Classes WHERE join_code = ?'
    ).get(joinCode);

    if (!classInfo) {
      return res.status(404).json({ error: 'Invalid join code' });
    }

    // Check for duplicate enrolment
    const existing = db.prepare(
      'SELECT 1 FROM Enrollments WHERE student_id = ? AND class_id = ?'
    ).get(req.userId, classInfo.class_id);

    if (existing) {
      return res.status(409).json({ error: 'Already enrolled in this class' });
    }

    db.prepare(
      'INSERT INTO Enrollments (student_id, class_id) VALUES (?, ?)'
    ).run(req.userId, classInfo.class_id);

    res.status(201).json({ message: 'Enrolled successfully', className: classInfo.class_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to enrol' });
  }
});

module.exports = router;
