class PhysicsState {
  constructor(x, y, vx, vy, mass) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.mass = mass;
    this.ax = 0;
    this.ay = 0;
    this.dragFx = 0;
    this.dragFy = 0;
  }

  clone() {
    var c = new PhysicsState(this.x, this.y, this.vx, this.vy, this.mass);
    c.ax = this.ax;
    c.ay = this.ay;
    c.dragFx = this.dragFx;
    c.dragFy = this.dragFy;
    return c;
  }
}
