class SimulationEnvironment {
  constructor(gravity, fixedDt) {
    this.entities = [];
    this.obstacles = [];
    this.gravity = gravity || 9.81;
    this.fixedDt = fixedDt || 0.005;
    this.accumulator = 0;
    this.timeScale = 1.0;
    this.collisionResolver = new CollisionResolver();
  }

  tick(realDeltaTime) {
    var scaledDelta = realDeltaTime * this.timeScale;
    this.accumulator += scaledDelta;

    // run as many fixed steps as we can fit into the accumulated time
    while (this.accumulator >= this.fixedDt) {
      for (var i = 0; i < this.entities.length; i++) {
        var entity = this.entities[i];
        if (entity.isActive && entity instanceof Projectile) {
          entity.update(this.fixedDt, this.gravity);
        }
      }
      this.collisionResolver.checkCollisions(this.entities, this.obstacles);
      this.accumulator -= this.fixedDt;
    }
  }

  addEntity(entity) {
    this.entities.push(entity);
  }

  removeEntity(id) {
    this.entities = this.entities.filter(e => e.getId() !== id);
  }

  addObstacle(obstacle) {
    this.obstacles.push(obstacle);
    this.entities.push(obstacle);
  }

  setTimeScale(scale) {
    this.timeScale = scale;
  }

  pause() { this.setTimeScale(0); }
  resume() { this.setTimeScale(1); }
}
