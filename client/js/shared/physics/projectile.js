// I split this into separate objects (state, drag, recorder) rather than having one massive class, because I needed different drag models to be swappable without rewriting the physics each time

class Projectile extends Entity {
  constructor(id, physicsState, dragModel) {
    super(id, physicsState.x, physicsState.y);
    this.physicsState = physicsState;
    this.dragModel = dragModel;
    this.trajectoryRecorder = new TrajectoryRecorder();

    this._initialState = physicsState.clone();
  }

  update(dt, gravity) {
    if (!this.isActive) return;

    this._rk4Step(this.physicsState, dt, gravity, this.dragModel);

    // keep entity position in sync with physics state
    this.x = this.physicsState.x;
    this.y = this.physicsState.y;

    this.trajectoryRecorder.record(this.physicsState);
  }

  getState() {
    var s = this.physicsState;
    return {
      x: s.x, y: s.y,
      vx: s.vx, vy: s.vy,
      ax: s.ax, ay: s.ay,
      dragFx: s.dragFx, dragFy: s.dragFy
    };
  }

  reset() {
    var init = this._initialState;
    this.physicsState = init.clone();
    this.x = init.x;
    this.y = init.y;
    this.isActive = true;
    this.trajectoryRecorder.clear();
  }

  // RK4
  _rk4Step(state, dt, gravity, dragModel) {
    var k1 = this._calcAccel(state, gravity, dragModel);

    var mid1 = state.clone();
    mid1.vx += 0.5 * dt * k1.ax;
    mid1.vy += 0.5 * dt * k1.ay;
    var k2 = this._calcAccel(mid1, gravity, dragModel);

    var mid2 = state.clone();
    mid2.vx += 0.5 * dt * k2.ax;
    mid2.vy += 0.5 * dt * k2.ay;
    var k3 = this._calcAccel(mid2, gravity, dragModel);

    var endState = state.clone();
    endState.vx += dt * k3.ax;
    endState.vy += dt * k3.ay;
    var k4 = this._calcAccel(endState, gravity, dragModel);

    // weighted average
    var axAvg = (k1.ax + 2 * k2.ax + 2 * k3.ax + k4.ax) / 6;
    var ayAvg = (k1.ay + 2 * k2.ay + 2 * k3.ay + k4.ay) / 6;

    state.vx += axAvg * dt;
    state.vy += ayAvg * dt;
    state.x  += state.vx * dt;
    state.y  += state.vy * dt;
    state.ax = axAvg;
    state.ay = ayAvg;

    // store the drag force so the HUD can display it
    var finalDrag = dragModel.calculateForce(
      state.vx, state.vy,
      Math.sqrt(state.vx * state.vx + state.vy * state.vy)
    );
    state.dragFx = finalDrag.fx;
    state.dragFy = finalDrag.fy;
  }

  _calcAccel(state, gravity, dragModel) {
    var speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    var dragForce = dragModel.calculateForce(state.vx, state.vy, speed);

    return {
      ax: dragForce.fx / state.mass,
      ay: -gravity + (dragForce.fy / state.mass),
      vx: state.vx,
      vy: state.vy
    };
  }
}
