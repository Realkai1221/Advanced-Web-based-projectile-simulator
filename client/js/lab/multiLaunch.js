// lets you fire 2-4 projectiles at once to compare trajectories
// I wanted to see how different angles look next to each other
class MultiLaunchPanel {
  constructor(colours) {
    this.colours = colours;
    this.isActive = false;
    this.configCount = 2;
  }

  init() {
    var toggle = document.getElementById('multiLaunchToggle');
    var panel = document.getElementById('multiLaunchPanel');
    var addBtn = document.getElementById('multiLaunchAdd');

    if (toggle) {
      toggle.addEventListener('change', () => {
        this.isActive = toggle.checked;
        panel.classList.toggle('hidden', !this.isActive);
        if (this.isActive) this._renderRows();
      });
    }

    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (this.configCount < 4) {
          this.configCount++;
          this._renderRows();
        }
      });
    }
  }

  _renderRows() {
    var container = document.getElementById('multiLaunchConfigs');
    if (!container) return;

    let html = '';
    for (let i = 0; i < this.configCount; i++) {
      var colour = this.colours[i % this.colours.length];
      html += `
        <div class="multi-config-row" style="border-left: 3px solid ${colour}; padding-left: 0.5rem; margin-bottom: 0.5rem;">
          <div class="slider-group">
            <label>P${i + 1} Angle <span id="mlAngleVal${i}">${45 - i * 10}°</span></label>
            <input type="range" id="mlAngle${i}" min="0" max="90" step="0.5" value="${45 - i * 10}"
                   oninput="document.getElementById('mlAngleVal${i}').textContent=this.value+'°'">
          </div>
          <div class="slider-group">
            <label>P${i + 1} Velocity <span id="mlVelVal${i}">30 m/s</span></label>
            <input type="range" id="mlVel${i}" min="1" max="100" step="0.5" value="30"
                   oninput="document.getElementById('mlVelVal${i}').textContent=this.value+' m/s'">
          </div>
        </div>
      `;
    }

    // Remove button only if more than 2
    if (this.configCount > 2) {
      html += `<button class="btn-reset" style="font-size:0.75rem; padding:0.3rem;"
               onclick="document.getElementById('multiLaunchPanel').__multiLaunch.removeConfig()">Remove Last</button>`;
    }

    container.innerHTML = html;
  }

  removeConfig() {
    if (this.configCount > 2) {
      this.configCount--;
      this._renderRows();
    }
  }

  // Returns array of angle, velocity for each configured projectile
  getConfigs() {
    var configs = [];
    for (let i = 0; i < this.configCount; i++) {
      var angleEl = document.getElementById(`mlAngle${i}`);
      var velEl = document.getElementById(`mlVel${i}`);
      if (angleEl && velEl) {
        configs.push({
          angle: parseFloat(angleEl.value),
          velocity: parseFloat(velEl.value)
        });
      }
    }
    return configs;
  }
}
