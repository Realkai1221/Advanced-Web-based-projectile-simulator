var express = require('express');
var router = express.Router();
var db = require('../database/db');
var { authenticate } = require('../middleware/auth');
var Graph = require('../utils/graph');

// list assignments for a class 
router.get('/:classId', authenticate, (req, res) => {
  try {
    const classId = req.params.classId;

    const assignments = db.prepare(
      'SELECT * FROM Assignments WHERE class_id = ? ORDER BY assignment_id'
    ).all(classId);

    // Get all prereqs for this class's assignments
    const prereqs = db.prepare(`
      SELECT ap.assignment_id, ap.required_assignment_id
      FROM AssignmentPrereqs ap
      JOIN Assignments a ON ap.assignment_id = a.assignment_id
      WHERE a.class_id = ?
    `).all(classId);

    // For students, determine which assignments are locked
    if (req.userRole === 'student') {
      const completedIds = db.prepare(`
        SELECT DISTINCT assignment_id FROM Attempts
        WHERE user_id = ? AND is_success = 1
      `).all(req.userId).map(r => r.assignment_id);

      const completedSet = new Set(completedIds);

      for (const assignment of assignments) {
        const required = prereqs
          .filter(p => p.assignment_id === assignment.assignment_id)
          .map(p => p.required_assignment_id);

        assignment.locked = required.length > 0 && !required.every(id => completedSet.has(id));
        assignment.prereqIds = required;
      }
    } else {
      // Teachers see prereqs but nothing is locked
      for (const assignment of assignments) {
        assignment.prereqIds = prereqs
          .filter(p => p.assignment_id === assignment.assignment_id)
          .map(p => p.required_assignment_id);
        assignment.locked = false;
      }
    }

    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// single assignment by id
router.get('/single/:id', authenticate, (req, res) => {
  try {
    const assignment = db.prepare(
      'SELECT * FROM Assignments WHERE assignment_id = ?'
    ).get(req.params.id);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// teacher creates a new assignment
router.post('/', authenticate, (req, res) => {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Validate required fields
    const { name, classId, targetX } = req.body;
    if (!name || !/^[A-Za-z0-9 _-]{3,50}$/.test(name)) {
      return res.status(400).json({ error: 'Name must be 3-50 characters' });
    }
    if (!classId) {
      return res.status(400).json({ error: 'classId is required' });
    }
    if (targetX === undefined || targetX === null) {
      return res.status(400).json({ error: 'targetX is required' });
    }
    const g = parseFloat(req.body.gravity);
    if (req.body.gravity !== undefined && (isNaN(g) || g < 0.1 || g > 25.0)) {
      return res.status(400).json({ error: 'gravity must be between 0.1 and 25.0' });
    }

    try {
      const { classId, name, gravity, dragModel, dragCoefficient, targetX, targetY, successThreshold, prereqIds } = req.body;

      // Verify teacher owns this class
      const classInfo = db.prepare(
        'SELECT 1 FROM Classes WHERE class_id = ? AND teacher_id = ?'
      ).get(classId, req.userId);

      if (!classInfo) {
        return res.status(403).json({ error: 'Not your class' });
      }

      // Validate prereq cycle if prereqIds provided
      if (prereqIds && prereqIds.length > 0) {
        const cycleError = _checkPrereqCycle(classId, null, prereqIds);
        if (cycleError) return res.status(400).json({ error: cycleError });
      }

      db.prepare(`
        INSERT INTO Assignments (class_id, name, gravity, drag_model, drag_coefficient, target_x, target_y, success_threshold)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        classId, name,
        gravity || 9.81,
        dragModel || 'none',
        dragCoefficient || 0.0,
        targetX,
        targetY || 0.0,
        successThreshold || 5.0
      );

      // Get the new assignment ID
      const newAssignment = db.prepare(
        'SELECT assignment_id FROM Assignments WHERE class_id = ? AND name = ? ORDER BY assignment_id DESC'
      ).get(classId, name);

      // Insert prereqs
      if (prereqIds && prereqIds.length > 0 && newAssignment) {
        for (const reqId of prereqIds) {
          db.prepare(
            'INSERT INTO AssignmentPrereqs (assignment_id, required_assignment_id) VALUES (?, ?)'
          ).run(newAssignment.assignment_id, reqId);
        }
      }

      res.status(201).json({ message: 'Assignment created', assignmentId: newAssignment?.assignment_id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  }
);

// update an existing assignment
router.put('/:id', authenticate, (req, res) => {
    if (req.userRole !== 'teacher') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Validate ranges if provided
    const g = parseFloat(req.body.gravity);
    if (req.body.gravity !== undefined && (isNaN(g) || g < 0.1 || g > 25.0)) {
      return res.status(400).json({ error: 'gravity must be between 0.1 and 25.0' });
    }

    try {
      const assignmentId = parseInt(req.params.id);
      const { name, gravity, dragModel, dragCoefficient, targetX, targetY, successThreshold, prereqIds } = req.body;

      // Verify teacher owns the assignment's class
      const assignment = db.prepare(`
        SELECT a.*, c.teacher_id FROM Assignments a
        JOIN Classes c ON a.class_id = c.class_id
        WHERE a.assignment_id = ?
      `).get(assignmentId);

      if (!assignment || assignment.teacher_id !== req.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Validate prereq cycle if prereqIds provided
      if (prereqIds) {
        const cycleError = _checkPrereqCycle(assignment.class_id, assignmentId, prereqIds);
        if (cycleError) return res.status(400).json({ error: cycleError });

        // Replace prereqs
        db.prepare('DELETE FROM AssignmentPrereqs WHERE assignment_id = ?').run(assignmentId);
        for (const reqId of prereqIds) {
          db.prepare(
            'INSERT INTO AssignmentPrereqs (assignment_id, required_assignment_id) VALUES (?, ?)'
          ).run(assignmentId, reqId);
        }
      }

      db.prepare(`
        UPDATE Assignments SET
          name = COALESCE(?, name),
          gravity = COALESCE(?, gravity),
          drag_model = COALESCE(?, drag_model),
          drag_coefficient = COALESCE(?, drag_coefficient),
          target_x = COALESCE(?, target_x),
          target_y = COALESCE(?, target_y),
          success_threshold = COALESCE(?, success_threshold)
        WHERE assignment_id = ?
      `).run(name, gravity, dragModel, dragCoefficient, targetX, targetY, successThreshold, assignmentId);

      res.json({ message: 'Assignment updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update assignment' });
    }
  }
);

// delete assignment and its prereq links
router.delete('/:id', authenticate, (req, res) => {
  if (req.userRole !== 'teacher') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const assignment = db.prepare(`
      SELECT a.assignment_id, c.teacher_id FROM Assignments a
      JOIN Classes c ON a.class_id = c.class_id
      WHERE a.assignment_id = ?
    `).get(req.params.id);

    if (!assignment || assignment.teacher_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove prereqs referencing this assignment (both directions)
    db.prepare('DELETE FROM AssignmentPrereqs WHERE assignment_id = ? OR required_assignment_id = ?')
      .run(req.params.id, req.params.id);

    db.prepare('DELETE FROM Assignments WHERE assignment_id = ?').run(req.params.id);

    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

// builds the prereq graph and checks if adding these new edges would create a loop had a bug where string ids and number ids were treated as different Map keys so now I convert everything to Number() first
function _checkPrereqCycle(classId, currentAssignmentId, newPrereqIds) {
  if (currentAssignmentId !== null) currentAssignmentId = Number(currentAssignmentId);
  newPrereqIds = newPrereqIds.map(Number);

  const graph = new Graph();

  // Get all assignments in the class
  const assignments = db.prepare(
    'SELECT assignment_id FROM Assignments WHERE class_id = ?'
  ).all(classId);

  for (const a of assignments) {
    graph.addNode(a.assignment_id);
  }

  // If this is a new assignment, add it to the graph
  if (currentAssignmentId) {
    graph.addNode(currentAssignmentId);
  }

  // Get existing prereq edges (excluding current assignment's prereqs which are being replaced)
  const existingPrereqs = db.prepare(`
    SELECT ap.assignment_id, ap.required_assignment_id
    FROM AssignmentPrereqs ap
    JOIN Assignments a ON ap.assignment_id = a.assignment_id
    WHERE a.class_id = ?
    ${currentAssignmentId ? 'AND ap.assignment_id != ?' : ''}
  `);

  const prereqs = currentAssignmentId
    ? existingPrereqs.all(classId, currentAssignmentId)
    : existingPrereqs.all(classId);

  for (const p of prereqs) {
    graph.addEdge(p.required_assignment_id, p.assignment_id);
  }

  // Add the new prereq edges
  const targetId = currentAssignmentId || 'NEW';
  if (!currentAssignmentId) graph.addNode(targetId);

  for (const reqId of newPrereqIds) {
    graph.addEdge(reqId, targetId);
  }

  // Log graph edges before cycle check
  console.log('Prereq graph edges:');
  for (const [node, neighbours] of graph.adjacencyList) {
    if (neighbours.length > 0) {
      console.log(`  ${node} (${typeof node}) → [${neighbours.map(n => `${n} (${typeof n})`).join(', ')}]`);
    }
  }

  // Check for cycle via topological sort
  try {
    graph.topologicalSort();
    return null; // no cycle
  } catch (e) {
    return 'Prerequisite chain contains a cycle';
  }
}

module.exports = router;
