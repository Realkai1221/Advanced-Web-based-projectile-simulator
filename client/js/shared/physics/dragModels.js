class DragModel {
  calculateForce(vx, vy, speed) {
    throw new Error('calculateForce() must be overridden by subclass');
  }
}

class NoDrag extends DragModel {
  calculateForce(vx, vy, speed) {
    return { fx: 0, fy: 0 };
  }
}

class LinearDrag extends DragModel {
  constructor(coeff) {
    super();
    this.coeff = coeff;
  }

  // F = -c * v
  calculateForce(vx, vy, speed) {
    return {
      fx: -this.coeff * vx,
      fy: -this.coeff * vy
    };
  }
}

class QuadraticDrag extends DragModel {
  constructor(rho, cd, area) {
    super();
    this.rho = rho;
    this.cd = cd;
    this.area = area;
  }

  // F = 0.5 * rho * Cd * A * v^2
  calculateForce(vx, vy, speed) {
    if (speed === 0) return { fx: 0, fy: 0 };

    var mag = 0.5 * this.rho * this.cd * this.area * speed * speed;
    return {
      fx: -mag * (vx / speed),
      fy: -mag * (vy / speed)
    };
  }
}
