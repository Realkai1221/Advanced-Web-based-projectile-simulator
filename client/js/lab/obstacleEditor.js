// added this feature last where you need to toggle placement mode then click
// where you want the block, took a while to get the preview working
class ObstacleEditor {
  constructor(labController) {
    this.lab = labController;
    this.isActive = false;
    this.obstacleCount = 0;

    this.width = 10;
    this.height = 10;
    this.restitution = 0.7;

    this.previewX = null;
    this.previewY = null;
  }

  init() {
    var toggleBtn = document.getElementById('obstacleToggleBtn');
    var clearBtn = document.getElementById('obstacleClearBtn');
    var widthSlider = document.getElementById('obstacleWidth');
    var heightSlider = document.getElementById('obstacleHeight');
    var restSlider = document.getElementById('obstacleRestitution');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearAll());
    }

    if (widthSlider) {
      widthSlider.addEventListener('input', () => {
        this.width = parseFloat(widthSlider.value);
        document.getElementById('obstacleWidthValue').textContent = this.width + 'm';
      });
    }

    if (heightSlider) {
      heightSlider.addEventListener('input', () => {
        this.height = parseFloat(heightSlider.value);
        document.getElementById('obstacleHeightValue').textContent = this.height + 'm';
      });
    }

    if (restSlider) {
      restSlider.addEventListener('input', () => {
        this.restitution = parseFloat(restSlider.value);
        document.getElementById('obstacleRestitutionValue').textContent = this.restitution;
      });
    }

    var canvas = this.lab.renderer.canvas;

    // track the mouse so we can show a ghost preview of the obstacle
    canvas.addEventListener('mousemove', (e) => {
      if (!this.isActive) return;
      var rect = canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;
      var world = this.lab.renderer.screenToWorld(sx, sy);
      this.previewX = world.wx;
      this.previewY = world.wy;
      this.lab._drawFrame();
    });

    // actually place the obstacle when they click
    canvas.addEventListener('click', (e) => {
      if (!this.isActive) return;
      var rect = canvas.getBoundingClientRect();
      var sx = e.clientX - rect.left;
      var sy = e.clientY - rect.top;
      var world = this.lab.renderer.screenToWorld(sx, sy);
      this._placeObstacle(world.wx, world.wy);
    });
  }

  toggle() {
    this.isActive = !this.isActive;
    var btn = document.getElementById('obstacleToggleBtn');
    if (btn) {
      btn.textContent = this.isActive ? 'Done Placing' : 'Place Obstacle';
      btn.classList.toggle('active', this.isActive);
    }
    this.lab.renderer.canvas.style.cursor = this.isActive ? 'crosshair' : 'default';
    this.previewX = null;
    this.previewY = null;
  }

  _placeObstacle(wx, wy) {
    var x = wx - this.width / 2;
    var y = wy - this.height / 2;
    var id = `obs_${++this.obstacleCount}`;

    var obstacle = new Obstacle(id, x, y, this.width, this.height, this.restitution);
    this.lab.simEnv.addObstacle(obstacle);
    this.lab._drawFrame();
  }

  clearAll() {
    this.lab.simEnv.obstacles = [];
    this.lab.simEnv.entities = this.lab.simEnv.entities.filter(e => !(e instanceof Obstacle));
    this.lab._drawFrame();
  }

  drawPreview() {
    if (!this.isActive || this.previewX === null) return;

    var renderer = this.lab.renderer;
    var ctx = renderer.ctx;
    var x = this.previewX - this.width / 2;
    var y = this.previewY - this.height / 2;

    var topLeft = renderer.worldToScreen(x, y + this.height);
    var bottomRight = renderer.worldToScreen(x + this.width, y);
    var w = bottomRight.sx - topLeft.sx;
    var h = bottomRight.sy - topLeft.sy;

    ctx.fillStyle = 'rgba(15, 52, 96, 0.4)';
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.6)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.fillRect(topLeft.sx, topLeft.sy, w, h);
    ctx.strokeRect(topLeft.sx, topLeft.sy, w, h);
    ctx.setLineDash([]);
  }
}
