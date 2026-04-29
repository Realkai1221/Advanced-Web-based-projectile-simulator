class Queue {
  constructor() {
    this.items = [];
    this.front = 0;
    this.rear = -1;
  }

  enqueue(val) {
    this.rear++;
    this.items[this.rear] = val;
  }

  dequeue() {
    if (this.isEmpty()) return null;
    var val = this.items[this.front];
    this.front++;
    return val;
  }

  peek() {
    if (this.isEmpty()) return null;
    return this.items[this.front];
  }

  isEmpty() { return this.front > this.rear; }
  size() { return this.rear - this.front + 1; }
}
