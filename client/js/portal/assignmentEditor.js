// the undo/redo was hard where my first attempt saved every keystroke which filled up the stack instantly. now it only saves when the user clicks away from a field (blur event)
class AssignmentEditor {
  constructor(el, saveCb) {
    this.container = el;
    this.onSave = saveCb;
    this.undoStack = new Stack();
    this.redoStack = new Stack();
    this.currentState = null;
    this.editingId = null;
    this.classId = null;
    this.assignments = [];
    this._stateOnFocus = null; // snapshot captured on field focus, before input events mutate currentState
  }

  open(classId, assignment = null, allAssignments = []) {
    this.classId = classId;
    this.assignments = allAssignments;
    this.editingId = assignment ? assignment.assignment_id : null;
    this.undoStack.clear();
    this.redoStack.clear();

    this.currentState = assignment ? {
      name: assignment.name,
      gravity: assignment.gravity,
      dragModel: assignment.drag_model,
      dragCoefficient: assignment.drag_coefficient,
      targetX: assignment.target_x,
      targetY: assignment.target_y || 0,
      successThreshold: assignment.success_threshold,
      prereqIds: assignment.prereqIds || []
    } : {
      name: '', gravity: 9.81, dragModel: 'none', dragCoefficient: 0,
      targetX: 50, targetY: 0, successThreshold: 5, prereqIds: []
    };

    this._render();
    this._setupEvents();
    this.container.classList.remove('hidden');
  }

  close() {
    this.container.classList.add('hidden');
    this.editingId = null;
  }

  _render() {
    var s = this.currentState;
    var prereqOptions = this.assignments
      .filter(a => a.assignment_id !== this.editingId)
      .map(a => {
        var checked = s.prereqIds.indexOf(a.assignment_id) !== -1 ? 'checked' : '';
        return `<label class="prereq-checkbox">
          <input type="checkbox" data-prereq-id="${a.assignment_id}" ${checked}> ${a.name}
        </label>`;
      }).join('');

    this.container.innerHTML = `
      <div class="editor-header">
        <h3>${this.editingId ? 'Edit' : 'New'} Assignment</h3>
        <div class="editor-actions">
          <button class="btn-aim" id="edUndo" ${this.undoStack.isEmpty() ? 'disabled' : ''}>Undo</button>
          <button class="btn-aim" id="edRedo" ${this.redoStack.isEmpty() ? 'disabled' : ''}>Redo</button>
        </div>
      </div>
      <div class="editor-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="edName" value="${s.name}" data-field="name" data-type="string">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Gravity (m/s²)</label>
            <input type="number" id="edGravity" value="${s.gravity}" step="0.01" min="0.1" max="25"
                   data-field="gravity" data-type="number">
          </div>
          <div class="form-group">
            <label>Target X (m)</label>
            <input type="number" id="edTargetX" value="${s.targetX}" step="1" min="10" max="1000"
                   data-field="targetX" data-type="number">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Target Y (m)</label>
            <input type="number" id="edTargetY" value="${s.targetY}" step="1" min="0" max="100"
                   data-field="targetY" data-type="number">
          </div>
          <div class="form-group">
            <label>Success Threshold (m)</label>
            <input type="number" id="edThreshold" value="${s.successThreshold}" step="0.5" min="0.5" max="50"
                   data-field="successThreshold" data-type="number">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Drag Model</label>
            <select id="edDragModel" data-field="dragModel">
              <option value="none" ${s.dragModel === 'none' ? 'selected' : ''}>None</option>
              <option value="linear" ${s.dragModel === 'linear' ? 'selected' : ''}>Linear</option>
              <option value="quadratic" ${s.dragModel === 'quadratic' ? 'selected' : ''}>Quadratic</option>
            </select>
          </div>
          <div class="form-group">
            <label>Drag Coefficient</label>
            <input type="number" id="edDragCoeff" value="${s.dragCoefficient}" step="0.01" min="0" max="5"
                   data-field="dragCoefficient" data-type="number">
          </div>
        </div>
        ${prereqOptions ? `<div class="form-group"><label>Prerequisites</label><div class="prereq-list">${prereqOptions}</div></div>` : ''}
      </div>
      <div class="editor-buttons">
        <button class="btn-primary" id="edSaveBtn">
          ${this.editingId ? 'Update' : 'Create'}
        </button>
        ${this.editingId ? '<button class="btn-reset" id="edDeleteBtn">Delete</button>' : ''}
        <button class="btn-reset" id="edCancelBtn">Cancel</button>
      </div>
      <div id="editorMessage" class="form-message"></div>
    `;
  }

 
  _setupEvents() {
    var self = this;

    // Text and number inputs: update state live on 'input', push undo on 'change' (blur/Enter)
    this.container.querySelectorAll('input[data-field], select[data-field]').forEach(el => {
      var field = el.dataset.field;
      var isNumber = el.dataset.type === 'number';

      // grab the state NOW before the user starts typing otherwise the input event changes currentState and I cant tell what changed
      el.addEventListener('focus', () => {
        self._stateOnFocus = self._copy(self.currentState);
      });

      // Live update (no undo push, no re-render) so keeps focus intact
      el.addEventListener('input', () => {
        self.currentState[field] = isNumber ? parseFloat(el.value) : el.value;
      });

      // Meaningful state change (push undo on blur/Enter for inputs, or change for selects)
      el.addEventListener('change', () => {
        self._saveChange(field, isNumber ? parseFloat(el.value) : el.value);
      });
    });

    // Prereq checkboxes
    this.container.querySelectorAll('[data-prereq-id]').forEach(cb => {
      cb.addEventListener('change', () => {
        self.undoStack.push(self._copy(self.currentState));
        self.redoStack.clear();
        var ids = [];
        self.container.querySelectorAll('[data-prereq-id]').forEach(box => {
          if (box.checked) ids[ids.length] = parseInt(box.dataset.prereqId);
        });
        self.currentState.prereqIds = ids;
        self._updateButtons();
      });
    });

    // Undo / Redo buttons
    document.getElementById('edUndo').addEventListener('click', () => self._undo());
    document.getElementById('edRedo').addEventListener('click', () => self._redo());

    // Save / Delete / Cancel
    document.getElementById('edSaveBtn').addEventListener('click', () => self._save());
    var delBtn = document.getElementById('edDeleteBtn');
    if (delBtn) delBtn.addEventListener('click', () => self._delete());
    document.getElementById('edCancelBtn').addEventListener('click', () => self.close());
  }

  _copy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // only push to undo when the user actually finishes editing (not every keystroke)
  _saveChange(field, value) {
    // Compare against the pre-edit snapshot (captured on focus), not currentState
    // which was already mutated by the live 'input' handler
    var baseline = this._stateOnFocus;
    if (!baseline || baseline[field] === value) {
      this._stateOnFocus = null;
      return;
    }

    this.undoStack.push(baseline);
    this.redoStack.clear();
    this.currentState[field] = value;
    this._stateOnFocus = null;
    console.log('Undo pushed — undoStack size:', this.undoStack.size());
    this._updateButtons();
  }

  _undo() {
    if (this.undoStack.isEmpty()) return;
    this.redoStack.push(this._copy(this.currentState));
    this.currentState = this.undoStack.pop();
    this._render();
    this._setupEvents();
  }

  _redo() {
    if (this.redoStack.isEmpty()) return;
    this.undoStack.push(this._copy(this.currentState));
    this.currentState = this.redoStack.pop();
    this._render();
    this._setupEvents();
  }

  _updateButtons() {
    var undoBtn = document.getElementById('edUndo');
    var redoBtn = document.getElementById('edRedo');
    if (undoBtn) undoBtn.disabled = this.undoStack.isEmpty();
    if (redoBtn) redoBtn.disabled = this.redoStack.isEmpty();
  }

  async _save() {
    var s = this.currentState;
    var msgEl = document.getElementById('editorMessage');

    if (!s.name || s.name.length < 3) {
      msgEl.textContent = 'Name must be at least 3 characters';
      msgEl.className = 'form-message error';
      return;
    }

    try {
      if (this.editingId) {
        await api.put(`/api/assignments/${this.editingId}`, {
          name: s.name, gravity: s.gravity, dragModel: s.dragModel,
          dragCoefficient: s.dragCoefficient, targetX: s.targetX,
          targetY: s.targetY, successThreshold: s.successThreshold,
          prereqIds: s.prereqIds
        });
      } else {
        await api.post('/api/assignments', {
          classId: this.classId, name: s.name, gravity: s.gravity,
          dragModel: s.dragModel, dragCoefficient: s.dragCoefficient,
          targetX: s.targetX, targetY: s.targetY,
          successThreshold: s.successThreshold, prereqIds: s.prereqIds
        });
      }
      this.close();
      if (this.onSave) this.onSave();
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = 'form-message error';
    }
  }

  async _delete() {
    if (!this.editingId) return;
    try {
      await api.del(`/api/assignments/${this.editingId}`);
      this.close();
      if (this.onSave) this.onSave();
    } catch (err) {
      document.getElementById('editorMessage').textContent = err.message;
    }
  }
}
