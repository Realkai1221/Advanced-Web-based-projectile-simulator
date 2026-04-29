class Entity {
  constructor(id, x, y) {
    if (new.target === Entity) {
      throw new Error('Entity is abstract and cannot be instantiated directly');
    }
    this.id = id;
    this.x = x;
    this.y = y;
    this.isActive = true;
  }

  update(dt) {
    throw new Error('update(dt) must be overridden by subclass');
  }

  getId() { return this.id; }
  setActive(status) { this.isActive = status; }
}
