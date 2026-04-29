class Target extends Entity {
  constructor(id, x, y, radius) {
    super(id, x, y);
    this.radius = radius;
  }

  update(dt) {}

  checkHit(proj) {
    var dx = proj.x - this.x;
    var dy = proj.y - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }
}
