function simulateRange(angleDeg, velocity, mass, gravity, dragModel) {
  var rad = angleDeg * Math.PI / 180;
  var vx = velocity * Math.cos(rad);
  var vy = velocity * Math.sin(rad);

  var state = new PhysicsState(0, 0, vx, vy, mass);
  var proj = new Projectile('_opt', state, dragModel);
  var dt = 0.005;
  var steps = 0;

  while (proj.isActive && steps < 200000) {
    proj.update(dt, gravity);
    if (proj.y <= 0 && steps > 0) proj.setActive(false);
    steps++;
  }
  return proj.x;
}


// golden section narrows down the best angle much faster
function findOptimalAngle(velocity, mass, gravity, dragModel, tolerance) {
  if (!tolerance) tolerance = 0.01;
  var phi = (Math.sqrt(5) - 1) / 2;

  var a = 0, b = 90;
  var x1 = b - phi * (b - a);
  var x2 = a + phi * (b - a);
  var r1 = simulateRange(x1, velocity, mass, gravity, dragModel);
  var r2 = simulateRange(x2, velocity, mass, gravity, dragModel);

  while ((b - a) > tolerance) {
    if (r1 < r2) {
      a = x1; x1 = x2; r1 = r2;
      x2 = a + phi * (b - a);
      r2 = simulateRange(x2, velocity, mass, gravity, dragModel);
    } else {
      b = x2; x2 = x1; r2 = r1;
      x1 = b - phi * (b - a);
      r1 = simulateRange(x1, velocity, mass, gravity, dragModel);
    }
  }

  var best = (a + b) / 2;
  return { angle: best, range: simulateRange(best, velocity, mass, gravity, dragModel) };
}
