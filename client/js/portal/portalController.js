// this controls the three tabs in the portal and I kept it as one controller because they all share the same currentClassId
let assignmentEditor;
let analyticsDashboard;

class PortalController {
  constructor() {
    this.currentView = 'classes';
    this.currentClassId = null;
    this.classes = [];
    this.assignments = [];
    this.prereqGraph = null;
  }

  init() {
    // nav.js handles the login redirect but I also need to check theyre a teacher
    if (api.getRole() !== 'teacher') {
      window.location.href = 'index.html';
      return;
    }

    // Setup internal portal tabs
    document.querySelectorAll('[data-view]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchView(tab.dataset.view);
      });
    });

    // Initialise components
    assignmentEditor = new AssignmentEditor(
      document.getElementById('assignmentEditorPanel'),
      () => this._loadAssignments()
    );

    this.prereqGraph = new PrereqGraphView(document.getElementById('prereqCanvas'));

    analyticsDashboard = new AnalyticsDashboard(document.getElementById('analyticsContainer'));

    // Load initial view
    this.switchView('classes');
  }

  switchView(view) {
    this.currentView = view;

    document.querySelectorAll('[data-view]').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === view);
    });

    document.querySelectorAll('.portal-view').forEach(v => {
      v.classList.toggle('hidden', v.id !== `${view}View`);
    });

    if (view === 'classes') this._loadClasses();
    if (view === 'assignments' && this.currentClassId) this._loadAssignments();
    if (view === 'analytics' && this.currentClassId) analyticsDashboard.load(this.currentClassId);
  }

  // load the teachers classes
  async _loadClasses() {
    var container = document.getElementById('classList');
    try {
      this.classes = await api.get('/api/classes');
      this._renderClasses(this.classes);
    } catch (err) {
      container.innerHTML = `<p class="form-message error">${err.message}</p>`;
    }
  }

  _renderClasses(classes) {
    var container = document.getElementById('classList');

    if (classes.length === 0) {
      container.innerHTML = '<p class="form-message">No classes yet. Create one below.</p>';
      return;
    }

    container.innerHTML = classes.map(c => `
      <div class="class-card ${this.currentClassId === c.class_id ? 'selected' : ''}"
           onclick="portal._selectClass(${c.class_id})">
        <div class="class-card-header">
          <h4>${c.class_name}</h4>
          <span class="join-code">${c.join_code}</span>
        </div>
        <div class="class-card-meta">
          ${c.semester || ''} &middot; ${c.studentCount || 0} students
        </div>
      </div>
    `).join('');
  }

  _selectClass(classId) {
    this.currentClassId = classId;
    this._renderClasses(this.classes);
  }

  async _createClass() {
    var nameInput = document.getElementById('newClassName');
    var semesterInput = document.getElementById('newClassSemester');
    var msgEl = document.getElementById('createClassMessage');

    var className = nameInput.value.trim();
    if (!className || className.length < 3) {
      msgEl.textContent = 'Class name must be at least 3 characters';
      msgEl.className = 'form-message error';
      return;
    }

    try {
      await api.post('/api/classes', {
        className,
        semester: semesterInput.value.trim() || null
      });
      nameInput.value = '';
      semesterInput.value = '';
      msgEl.textContent = 'Class created!';
      msgEl.className = 'form-message success';
      // reload so the new class appears in the list
      await this._loadClasses();
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = 'form-message error';
    }
  }

  async _loadAssignments() {
    if (!this.currentClassId) {
      document.getElementById('assignmentsList').innerHTML =
        '<p class="form-message">Select a class first (in Classes tab).</p>';
      return;
    }

    try {
      this.assignments = await api.get(`/api/assignments/${this.currentClassId}`);
      this._renderAssignments();
      this.prereqGraph.render(this.assignments);
    } catch (err) {
      document.getElementById('assignmentsList').innerHTML =
        `<p class="form-message error">${err.message}</p>`;
    }
  }

  _renderAssignments() {
    var container = document.getElementById('assignmentsList');

    container.innerHTML = `
      <div class="assignments-header">
        <h3>Assignments</h3>
        <button class="btn-primary" onclick="portal._newAssignment()" style="padding:0.4rem 0.8rem; font-size:0.85rem;">+ New Assignment</button>
      </div>
      ${this.assignments.length === 0
        ? '<p class="form-message">No assignments yet.</p>'
        : this.assignments.map(a => `
          <div class="assignment-row" onclick="portal._editAssignment(${a.assignment_id})">
            <div class="assignment-name">${a.name}</div>
            <div class="assignment-meta">
              g=${a.gravity} &middot; drag=${a.drag_model} &middot; target=(${a.target_x}, ${a.target_y || 0}) &middot; threshold=${a.success_threshold}m
            </div>
          </div>
        `).join('')
      }
    `;
  }

  _newAssignment() {
    if (!this.currentClassId) {
      alert('Select a class first');
      return;
    }
    assignmentEditor.open(this.currentClassId, null, this.assignments);
  }

  _editAssignment(id) {
    var a = this.assignments.find(x => x.assignment_id === id);
    if (a) assignmentEditor.open(this.currentClassId, a, this.assignments);
  }
}

let portal;

document.addEventListener('DOMContentLoaded', () => {
  portal = new PortalController();
  portal.init();
});
