class VelocityOverlay {
  constructor(el) {
    this.container = el;

    this.container.innerHTML = ''
      + '<div class="hud-title">Velocity</div>'
      + '<div class="hud-row"><span class="hud-label">vx:</span> <span id="hudVx" class="hud-value">—</span> <span class="hud-unit">m/s</span></div>'
      + '<div class="hud-row"><span class="hud-label">vy:</span> <span id="hudVy" class="hud-value">—</span> <span class="hud-unit">m/s</span></div>'
      + '<div class="hud-row"><span class="hud-label">|v|:</span> <span id="hudSpeed" class="hud-value">—</span> <span class="hud-unit">m/s</span></div>'
      + '<div class="hud-row"><span class="hud-label">θ:</span> <span id="hudAngle" class="hud-value">—</span> <span class="hud-unit">°</span></div>'
      + '<div class="hud-row"><span class="hud-label">x:</span> <span id="hudX" class="hud-value">—</span> <span class="hud-unit">m</span></div>'
      + '<div class="hud-row"><span class="hud-label">y:</span> <span id="hudY" class="hud-value">—</span> <span class="hud-unit">m</span></div>';

    this.vxEl = document.getElementById('hudVx');
    this.vyEl = document.getElementById('hudVy');
    this.speedEl = document.getElementById('hudSpeed');
    this.angleEl = document.getElementById('hudAngle');
    this.xEl = document.getElementById('hudX');
    this.yEl = document.getElementById('hudY');
  }

  update(state) {
    var spd = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    var ang = Math.atan2(state.vy, state.vx) * (180 / Math.PI);

    this.vxEl.textContent = state.vx.toFixed(2);
    this.vyEl.textContent = state.vy.toFixed(2);
    this.speedEl.textContent = spd.toFixed(2);
    this.angleEl.textContent = ang.toFixed(1);
    this.xEl.textContent = state.x.toFixed(2);
    this.yEl.textContent = state.y.toFixed(2);
  }

  clear() {
    this.vxEl.textContent = '—';
    this.vyEl.textContent = '—';
    this.speedEl.textContent = '—';
    this.angleEl.textContent = '—';
    this.xEl.textContent = '—';
    this.yEl.textContent = '—';
  }
}
