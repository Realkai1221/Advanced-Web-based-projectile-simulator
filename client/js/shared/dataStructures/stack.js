class Stack {
  constructor() {
    this.items = [];
    this.top = -1;
  }

  push(val) {
    this.top++;
    this.items[this.top] = val;
  }

  pop() {
    if (this.isEmpty()) return null;
    var val = this.items[this.top];
    this.top--;
    return val;
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.top];
  }

  isEmpty() { return this.top === -1; }
  clear() { this.top = -1; this.items = []; }
  size() { return this.top + 1; }
}
