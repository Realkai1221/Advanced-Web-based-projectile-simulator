// this was one of the harder parts to get working
// the ground collision is simple but obstacle bouncing took a lot of trial and error
class CollisionResolver {
  constructor(groundLevel = 0) {
    this.groundLevel = groundLevel;
  }

  checkCollisions(entities, obstacles) {
    for (var i = 0; i < entities.length; i++) {
      var entity = entities[i];
      if (!entity.isActive || !(entity instanceof Projectile)) continue;

      // hit the ground so stop the projectile
      if (entity.y <= this.groundLevel) {
        entity.setActive(false);
        entity.y = this.groundLevel;
        entity.physicsState.y = this.groundLevel;
        entity.trajectoryRecorder.recordImpact(entity.x, this.groundLevel);
        continue;
      }

      // check each obstacle
      for (var j = 0; j < obstacles.length; j++) {
        var obstacle = obstacles[j];
        if (!obstacle.isActive) continue;

        var box = obstacle.getBoundingBox();
        var px = entity.x;
        var py = entity.y;

        // is the projectile inside the obstacle?
        if (px >= box.left && px <= box.right && py >= box.bottom && py <= box.top) {
          // work out which face it went through by finding the smallest overlap
          var overlapLeft = px - box.left;
          var overlapRight = box.right - px;
          var overlapBottom = py - box.bottom;
          var overlapTop = box.top - py;

          var minOverlap = Math.min(overlapLeft, overlapRight, overlapBottom, overlapTop);
          var nx = 0, ny = 0;

          if (minOverlap === overlapLeft) { nx = -1; }
          else if (minOverlap === overlapRight) { nx = 1; }
          else if (minOverlap === overlapBottom) { ny = -1; }
          else { ny = 1; }

          var state = entity.physicsState;
          var vDotN = state.vx * nx + state.vy * ny;

          // only bounce if actually moving into the surface, not away from it
          if (vDotN < 0) {
            this._bounce(entity, obstacle, nx, ny);
          }

          // push the projectile back outside so it doesnt get stuck
          state.x += nx * (minOverlap + 0.1);
          state.y += ny * (minOverlap + 0.1);
          entity.x = state.x;
          entity.y = state.y;
        }
      }
    }
  }

  _bounce(projectile, obstacle, nx, ny) {
    var state = projectile.physicsState;
    var e = obstacle.restitution;

    // reflection formula from physics
    var vDotN = state.vx * nx + state.vy * ny;
    state.vx = state.vx - (1 + e) * vDotN * nx;
    state.vy = state.vy - (1 + e) * vDotN * ny;
  }
}
