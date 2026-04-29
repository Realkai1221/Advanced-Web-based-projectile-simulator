class LabController {
  constructor() {
    this.simEnv = null;
    this.renderer = null;
    this.velocityOverlay = null;
    this.graphPanel = null;
    this.stepByStep = null;
    this.obstacleEditor = null;
    this.multiLaunch = null;

    this.projectiles = [];
    this.projectileCounter = 0;
    this.isRunning = false;
    this.lastFrameTime = null;
    this.selectedPointIndex = null;

    this.colours = ['#e94560', '#3498db', '#2ecc71', '#f39c12'];

    // these are for when the page is loaded from a teacher assignment
    this.assignmentMode = false;
    this.assignmentCompleted = false; // true if student already completed this assignment
    this.assignment = null;
    this.assignmentTarget = null;
    this.launchStartTime = null;
  }

  init() {
    var canvas = document.getElementById('simCanvas');
    this.renderer = new CanvasRenderer(canvas, 200, 100);

    this.simEnv = new SimulationEnvironment(9.81, 0.005);

    var hudContainer = document.getElementById('velocityHud');
    this.velocityOverlay = new VelocityOverlay(hudContainer);

    var graphContainer = document.getElementById('graphPanelContainer');
    this.graphPanel = new GraphPanel(graphContainer, this.colours);

    var stepContainer = document.getElementById('stepByStepPanel');
    this.stepByStep = new StepByStepPanel(stepContainer);

    this.obstacleEditor = new ObstacleEditor(this);
    this.obstacleEditor.init();

    this.multiLaunch = new MultiLaunchPanel(this.colours);
    this.multiLaunch.init();

    this.angleSlider = document.getElementById('angle');
    this.velocitySlider = document.getElementById('velocity');
    this.massSlider = document.getElementById('mass');
    this.gravitySlider = document.getElementById('gravity');
    this.dragModelSelect = document.getElementById('dragModel');
    this.dragCoefficientSlider = document.getElementById('dragCoefficient');
    this.dragCoefficientGroup = document.getElementById('dragCoefficientGroup');

    this._setupSlider(this.angleSlider, 'angleValue', '°');
    this._setupSlider(this.velocitySlider, 'velocityValue', ' m/s');
    this._setupSlider(this.massSlider, 'massValue', ' kg');
    this._setupSlider(this.gravitySlider, 'gravityValue', ' m/s²');
    this._setupSlider(this.dragCoefficientSlider, 'dragCoefficientValue', '');

    this.velocitySlider.addEventListener('input', () => this._updateForceLabel());
    this.dragCoefficientSlider.addEventListener('input', () => this._updateForceLabel());

    this.dragForceLabel = document.getElementById('dragForceLabel');

    this.dragModelSelect.addEventListener('change', () => {
      this.dragCoefficientGroup.classList.toggle('hidden', this.dragModelSelect.value === 'none');
      this._updateForceLabel();
    });

    document.getElementById('fireBtn').addEventListener('click', () => this.fire());
    document.getElementById('resetBtn').addEventListener('click', () => this.reset());

    document.querySelectorAll('[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-speed]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.simEnv.setTimeScale(parseFloat(btn.dataset.speed));
      });
    });

    canvas.addEventListener('click', (e) => {
      if (this.obstacleEditor.isActive) return;
      // originally this only worked when paused but I realised you also want to click the trail after the projectile has landed and the sim stopped
      if (this.simEnv.timeScale !== 0 && this.isRunning) return;

      var rect = canvas.getBoundingClientRect();
      // Scale CSS pixels to canvas pixels to handle CSS-scaled canvas
      var scaleX = canvas.width / rect.width;
      var scaleY = canvas.height / rect.height;
      var canvasX = (e.clientX - rect.left) * scaleX;
      var canvasY = (e.clientY - rect.top) * scaleY;
      this._pickPoint(canvasX, canvasY);
    });

    document.getElementById('optimalAngleBtn').addEventListener('click', () => this._bestAngle());

    // check if theres an assignmentId in the URL
    this._checkAssignment();

    this._updateForceLabel();
    this._drawFrame();
  }

  // If URL has ?assignmentId=X, retrieve and enter assignment mode
  async _checkAssignment() {
    var params = new URLSearchParams(window.location.search);
    var assignmentId = params.get('assignmentId');
    if (!assignmentId || !api.isLoggedIn()) return;

    var assignment = await api.get(`/api/assignments/single/${assignmentId}`);

    // see if theyve already passed it and go to practice mode if they have
    var alreadyCompleted = false;
    var attempts = await api.get(`/api/attempts/${assignmentId}`);
    alreadyCompleted = attempts.some(a => a.is_success === 1);

    this._startAssignment(assignment, alreadyCompleted);
  }

  _startAssignment(assignment, alreadyCompleted = false) {
    this.assignmentMode = true;
    this.assignmentCompleted = alreadyCompleted;
    this.assignment = assignment;

    // lock the sliders to the values the teacher set
    this.gravitySlider.value = assignment.gravity;
    document.getElementById('gravityValue').textContent = assignment.gravity + ' m/s²';
    this.gravitySlider.disabled = true;

    this.dragModelSelect.value = assignment.drag_model;
    this.dragModelSelect.disabled = true;

    if (assignment.drag_model !== 'none') {
      this.dragCoefficientGroup.classList.remove('hidden');
      this.dragCoefficientSlider.value = assignment.drag_coefficient;
      document.getElementById('dragCoefficientValue').textContent = assignment.drag_coefficient;
      this.dragCoefficientSlider.disabled = true;
    }

    this.massSlider.disabled = true;

    this.simEnv.gravity = assignment.gravity;

    // put the target where the teacher configured it
    var targetX = assignment.target_x;
    var targetY = assignment.target_y || 0;
    var threshold = assignment.success_threshold;

    this.assignmentTarget = new Target('assignment_target', targetX, targetY, threshold);
    this.simEnv.addEntity(this.assignmentTarget);

    // show the assignment info at the top of the control panel
    var banner = document.getElementById('assignmentBanner');
    banner.classList.remove('hidden');
    document.getElementById('assignmentName').textContent = assignment.name;
    document.getElementById('assignmentTarget').textContent =
      `Target: (${targetX}, ${targetY})m | Threshold: ${threshold}m | g=${assignment.gravity} | drag=${assignment.drag_model}`;

    if (this.assignmentCompleted) {
      var feedbackEl = document.getElementById('assignmentFeedback');
      feedbackEl.textContent = 'Assignment Complete — Practice Mode (attempts not recorded)';
      feedbackEl.className = 'assignment-feedback hit';
    }

    this._drawFrame();
  }

  // reads the sliders and launches a projectile
  fire() {
    var mass = parseFloat(this.massSlider.value);
    var gravity = parseFloat(this.gravitySlider.value);
    this.simEnv.gravity = gravity;
    this.selectedPointIndex = null;
    this.stepByStep.hide();

    // reset the hit/miss message from last shot
    if (this.assignmentMode) {
      document.getElementById('assignmentFeedback').textContent = '';
      document.getElementById('assignmentFeedback').className = 'assignment-feedback';
    }

    if (this.multiLaunch.isActive && !this.assignmentMode) {
      var configs = this.multiLaunch.getConfigs();
      for (var cfg of configs) {
        this._launch(cfg.angle, cfg.velocity, mass);
      }
    } else {
      var angle = parseFloat(this.angleSlider.value);
      var velocity = parseFloat(this.velocitySlider.value);
      this._launch(angle, velocity, mass);
    }

    this.launchStartTime = performance.now();

    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this._animate();
    }
  }

  _launch(angleDeg, velocity, mass) {
    var dragModel = this._getDrag();
    var angleRad = angleDeg * Math.PI / 180;
    var vx = velocity * Math.cos(angleRad);
    var vy = velocity * Math.sin(angleRad);

    var state = new PhysicsState(10, 0, vx, vy, mass);
    var id = `proj_${++this.projectileCounter}`;
    var projectile = new Projectile(id, state, dragModel);

    this.simEnv.addEntity(projectile);
    this.projectiles.push(projectile);
  }

  reset() {
    this.isRunning = false;
    this.lastFrameTime = null;
    this.selectedPointIndex = null;

    for (var proj of this.projectiles) {
      this.simEnv.removeEntity(proj.getId());
    }
    this.projectiles = [];

    this.velocityOverlay.clear();
    this.graphPanel.clear();
    this.stepByStep.hide();

    if (this.assignmentMode) {
      document.getElementById('assignmentFeedback').textContent = '';
      document.getElementById('assignmentFeedback').className = 'assignment-feedback';
    }

    this._drawFrame();
  }

  _getDrag() {
    var model = this.dragModelSelect.value;
    var coeff = parseFloat(this.dragCoefficientSlider.value);

    switch (model) {
      case 'linear':
        return new LinearDrag(coeff);
      case 'quadratic':
        return new QuadraticDrag(1.225, coeff, 0.01);
      default:
        return new NoDrag();
    }
  }

  _animate() {
    if (!this.isRunning) return;

    var now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    if (dt > 0.1) dt = 0.1;

    this.simEnv.tick(dt);
    this._drawFrame();

    var activeProj = this._getFlying();
    if (activeProj) {
      this.velocityOverlay.update(activeProj.getState());
    }

    this.graphPanel.update(this.projectiles);

    if (this._anyFlying()) {
      requestAnimationFrame(() => this._animate());
    } else {
      this.isRunning = false;
      if (this.projectiles.length > 0) {
        var last = this.projectiles[this.projectiles.length - 1];
        this.velocityOverlay.update(last.getState());

        if (this.assignmentMode) {
          this._checkAttempt(last);
        }
      }
      this.graphPanel.update(this.projectiles);
    }
  }

  // check how close the projectile landed to the target
  async _checkAttempt(projectile) {
    var a = this.assignment;
    var state = projectile.getState();
    var targetX = a.target_x;
    var targetY = a.target_y || 0;

    var dx = state.x - targetX;
    var dy = state.y - targetY;
    var missDistance = Math.sqrt(dx * dx + dy * dy);
    var isSuccess = missDistance <= a.success_threshold;

    var durationMs = Math.round(performance.now() - this.launchStartTime);
    var initState = projectile._initialState;
    var launchSpeed = Math.sqrt(initState.vx * initState.vx + initState.vy * initState.vy);
    var launchAngle = Math.atan2(initState.vy, initState.vx) * 180 / Math.PI;

    var feedbackEl = document.getElementById('assignmentFeedback');

    // if already passed then just show the distance but dont send to server
    if (this.assignmentCompleted) {
      if (isSuccess) {
        feedbackEl.textContent = `Hit! (${missDistance.toFixed(1)}m) — Practice Mode`;
      } else {
        feedbackEl.textContent = `Missed by ${missDistance.toFixed(1)}m — Practice Mode`;
      }
      feedbackEl.className = 'assignment-feedback hit';
      return;
    }

    // if still working on it then show result and send to server
    if (isSuccess) {
      feedbackEl.textContent = `Hit! Assignment completed! (${missDistance.toFixed(1)}m from target)`;
      feedbackEl.className = 'assignment-feedback hit';
      this.assignmentCompleted = true; // prevent further logging
    } else {
      feedbackEl.textContent = `Missed by ${missDistance.toFixed(1)}m — try again!`;
      feedbackEl.className = 'assignment-feedback miss';
    }

    if (api.isLoggedIn()) {
      await api.post('/api/attempts', {
        assignmentId: a.assignment_id,
        launchAngle: Math.round(launchAngle * 100) / 100,
        initialVelocity: Math.round(launchSpeed * 100) / 100,
        missDistance: Math.round(missDistance * 100) / 100,
        durationMs: durationMs,
        isSuccess: isSuccess
      });
    }
  }

  _drawFrame() {
    this.renderer.clear();
    this.renderer.drawGrid();
    this.renderer.drawGround();

    // draw target if were in assignment mode
    if (this.assignmentTarget) {
      this.renderer.drawTarget(this.assignmentTarget);
    }

    for (var obstacle of this.simEnv.obstacles) {
      this.renderer.drawObstacle(obstacle);
    }

    this.obstacleEditor.drawPreview();

    for (let i = 0; i < this.projectiles.length; i++) {
      var proj = this.projectiles[i];
      var colour = this.colours[i % this.colours.length];
      var points = proj.trajectoryRecorder.getPoints();
      var opacity = proj.isActive ? 1.0 : 0.3;

      this.renderer.drawTrajectory(points, colour, opacity);
      this.renderer.drawProjectile(proj.x, proj.y, colour);

      if (proj.isActive) {
        var state = proj.getState();
        this.renderer.drawVelocityArrow(proj.x, proj.y, state.vx, state.vy);
      }
    }

    if (this.selectedPointIndex !== null && this.projectiles.length > 0) {
      var proj = this.projectiles[this.projectiles.length - 1];
      var points = proj.trajectoryRecorder.getPoints();
      var pt = points[this.selectedPointIndex];
      if (pt && !pt.impact) {
        var { sx, sy } = this.renderer.worldToScreen(pt.x, pt.y);
        var ctx = this.renderer.ctx;
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    this.renderer.drawLaunchPoint(10, 0);
  }

  _pickPoint(sx, sy) {
    console.log('_pickPoint fired', { sx, sy, projectileCount: this.projectiles.length });
    if (this.projectiles.length === 0) return;

    var proj = this.projectiles[this.projectiles.length - 1];
    var points = proj.trajectoryRecorder.getPoints();
    if (points.length === 0) return;

    let bestDist = Infinity;
    let bestIdx = 0;

    for (let i = 0; i < points.length; i++) {
      if (points[i].impact) continue;
      var screen = this.renderer.worldToScreen(points[i].x, points[i].y);
      var dx = screen.sx - sx;
      var dy = screen.sy - sy;
      var dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    if (Math.sqrt(bestDist) > 20) return;

    this.selectedPointIndex = bestIdx;
    var nextIdx = bestIdx + 1 < points.length ? bestIdx + 1 : bestIdx;

    this.stepByStep.showStep(
      points[bestIdx],
      points[nextIdx],
      this.simEnv.gravity,
      this.dragModelSelect.value,
      parseFloat(this.dragCoefficientSlider.value)
    );

    this._drawFrame();
  }

  _bestAngle() {
    var velocity = parseFloat(this.velocitySlider.value);
    var mass = parseFloat(this.massSlider.value);
    var gravity = parseFloat(this.gravitySlider.value);
    var dragModel = this._getDrag();

    var result = findOptimalAngle(velocity, mass, gravity, dragModel);

    var resultDiv = document.getElementById('optimalResult');
    resultDiv.innerHTML = `
      <div class="optimal-result">
        Optimal angle: <span class="value">${result.angle.toFixed(2)}°</span><br>
        Max range: <span class="value">${result.range.toFixed(2)} m</span>
      </div>
    `;

    this.angleSlider.value = result.angle.toFixed(1);
    document.getElementById('angleValue').textContent = result.angle.toFixed(1) + '°';
  }

  _getFlying() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (this.projectiles[i].isActive) return this.projectiles[i];
    }
    return null;
  }

  _anyFlying() {
    return this.projectiles.some(p => p.isActive);
  }

  _updateForceLabel() {
    var model = this.dragModelSelect.value;
    if (model === 'none') {
      this.dragForceLabel.textContent = '';
      return;
    }

    var v = parseFloat(this.velocitySlider.value);
    var coeff = parseFloat(this.dragCoefficientSlider.value);
    let force;

    if (model === 'linear') {
      // F = c * v
      force = coeff * v;
    } else {
      // Quadratic: F = 0.5 * rho * cd * A * v^2  (rho=1.225, A=0.01)
      force = 0.5 * 1.225 * coeff * 0.01 * v * v;
    }

    this.dragForceLabel.textContent = 'Force at current v: ' + force.toFixed(3) + ' N';
  }

  _setupSlider(slider, labelId, suffix) {
    var label = document.getElementById(labelId);
    var update = () => { label.textContent = slider.value + suffix; };
    slider.addEventListener('input', update);
    update();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  var lab = new LabController();
  lab.init();
});
