class TrajectoryRecorder {
  constructor() {
    this.points = [];
  }

  record(state) {
    this.points.push({
      x: state.x, y: state.y,
      vx: state.vx, vy: state.vy,
      ax: state.ax, ay: state.ay,
      dragFx: state.dragFx, dragFy: state.dragFy
    });
  }

  recordImpact(x, y) {
    this.points.push({ x, y, impact: true });
  }

  getPoints() { return this.points; }
  getPointAt(i) { return this.points[i] || null; }
  clear() { this.points = []; }
}
