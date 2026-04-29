class Obstacle extends Entity {
  constructor(id, x, y, width, height, restitution) {
    super(id, x, y);
    this.width = width;
    this.height = height;
    this.restitution = Math.max(0, Math.min(1, restitution));

    this.left = x;
    this.right = x + width;
    this.top = y + height;
    this.bottom = y;
  }

  update(dt) {}

  getBoundingBox() {
    return { left: this.left, right: this.right, top: this.top, bottom: this.bottom };
  }

  // works out which face was hit by comparing how deep the contact point is from each edge, scaled by the rectangle dimensions
  getSurfaceNormal(contactPoint) {
    var cx = (this.left + this.right) / 2;
    var cy = (this.bottom + this.top) / 2;
    var dx = contactPoint.x - cx;
    var dy = contactPoint.y - cy;

    var sx = Math.abs(dx) / (this.width / 2);
    var sy = Math.abs(dy) / (this.height / 2);

    if (sx > sy) {
      return { nx: dx > 0 ? 1 : -1, ny: 0 };
    } else {
      return { nx: 0, ny: dy > 0 ? 1 : -1 };
    }
  }
}
