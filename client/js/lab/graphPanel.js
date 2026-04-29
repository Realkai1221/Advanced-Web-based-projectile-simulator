class GraphPanel {
  constructor(el, colours) {
    this.container = el;
    this.colours = colours;

    // each point in the trajectory is 0.005s apart
    this.dt = 0.005;

    var baseOptions = {
      animation: false,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#8888aa', boxWidth: 12, font: { size: 10 } } }
      },
      scales: {
        x: {
          type: 'linear',
          ticks: { color: '#8888aa', font: { size: 9 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          type: 'linear',
          ticks: { color: '#8888aa', font: { size: 9 } },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      },
      elements: { point: { radius: 0 }, line: { borderWidth: 1.5 } }
    };

    var charts = [
      { id: 'chartYX', title: 'y vs x (trajectory)', xLabel: 'x (m)', yLabel: 'y (m)' },
      { id: 'chartVT', title: 'v vs t (velocity)', xLabel: 'time (s)', yLabel: 'v (m/s)' },
      { id: 'chartAT', title: 'a vs t (acceleration)', xLabel: 'time (s)', yLabel: 'a (m/s\u00B2)' },
      { id: 'chartSpeedT', title: '|v| vs t (speed)', xLabel: 'time (s)', yLabel: 'speed (m/s)' }
    ];

    this.container.innerHTML = charts.map(c => `
      <div class="graph-box">
        <div class="graph-title">${c.title}</div>
        <div class="graph-canvas-wrap"><canvas id="${c.id}"></canvas></div>
      </div>
    `).join('');

    this.chartYX = this._createChart('chartYX', 'x (m)', 'y (m)', baseOptions);
    this.chartVT = this._createChart('chartVT', 'time (s)', 'v (m/s)', baseOptions);
    this.chartAT = this._createChart('chartAT', 'time (s)', 'a (m/s\u00B2)', baseOptions);
    this.chartSpeedT = this._createChart('chartSpeedT', 'time (s)', 'speed (m/s)', baseOptions);
  }

  _createChart(canvasId, xLabel, yLabel, baseOptions) {
    var ctx = document.getElementById(canvasId).getContext('2d');
    var opts = JSON.parse(JSON.stringify(baseOptions));
    opts.scales.x.title = { display: true, text: xLabel, color: '#8888aa', font: { size: 9 } };
    opts.scales.y.title = { display: true, text: yLabel, color: '#8888aa', font: { size: 9 } };

    return new Chart(ctx, {
      type: 'line',
      data: { datasets: [] },
      options: opts
    });
  }

  // rebuilds all 4 charts every frame 
  update(projectiles) {
    var dt = this.dt;

    this.chartYX.data.datasets = projectiles.map((proj, i) => ({
      label: `Projectile ${i + 1}`,
      data: this._getXY(proj),
      borderColor: this.colours[i % this.colours.length],
      fill: false
    }));
    this.chartYX.update('none');

    var vtDatasets = [];
    projectiles.forEach((proj, i) => {
      var colour = this.colours[i % this.colours.length];
      var points = proj.trajectoryRecorder.getPoints().filter(p => !p.impact);
      vtDatasets.push({
        label: `P${i + 1} vx`,
        data: points.map((p, idx) => ({ x: idx * dt, y: p.vx })),
        borderColor: colour,
        borderDash: [],
        fill: false
      });
      vtDatasets.push({
        label: `P${i + 1} vy`,
        data: points.map((p, idx) => ({ x: idx * dt, y: p.vy })),
        borderColor: colour,
        borderDash: [4, 2],
        fill: false
      });
    });
    this.chartVT.data.datasets = vtDatasets;
    this.chartVT.update('none');

    var atDatasets = [];
    projectiles.forEach((proj, i) => {
      var colour = this.colours[i % this.colours.length];
      var points = proj.trajectoryRecorder.getPoints().filter(p => !p.impact);
      atDatasets.push({
        label: `P${i + 1} ax`,
        data: points.map((p, idx) => ({ x: idx * dt, y: p.ax || 0 })),
        borderColor: colour,
        borderDash: [],
        fill: false
      });
      atDatasets.push({
        label: `P${i + 1} ay`,
        data: points.map((p, idx) => ({ x: idx * dt, y: p.ay || 0 })),
        borderColor: colour,
        borderDash: [4, 2],
        fill: false
      });
    });
    this.chartAT.data.datasets = atDatasets;
    this.chartAT.update('none');

    this.chartSpeedT.data.datasets = projectiles.map((proj, i) => {
      var points = proj.trajectoryRecorder.getPoints().filter(p => !p.impact);
      return {
        label: `P${i + 1} |v|`,
        data: points.map((p, idx) => ({
          x: idx * dt,
          y: Math.sqrt((p.vx || 0) ** 2 + (p.vy || 0) ** 2)
        })),
        borderColor: this.colours[i % this.colours.length],
        fill: false
      };
    });
    this.chartSpeedT.update('none');
  }

  // pull out just x,y pairs for the position chart
  _getXY(proj) {
    return proj.trajectoryRecorder.getPoints()
      .filter(p => !p.impact)
      .map(p => ({ x: p.x, y: p.y }));
  }

  clear() {
    [this.chartYX, this.chartVT, this.chartAT, this.chartSpeedT].forEach(chart => {
      chart.data.datasets = [];
      chart.update('none');
    });
  }
}
