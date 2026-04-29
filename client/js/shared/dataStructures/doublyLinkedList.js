class DLLNode {
  constructor(data) {
    this.data = data;
    this.prev = null;
    this.next = null;
  }
}

class DoublyLinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.current = null; // used for stepping through the list
    this.length = 0;
  }

  insertAtTail(data) {
    var node = new DLLNode(data);
    if (this.tail === null) {
      this.head = node;
      this.tail = node;
    } else {
      node.prev = this.tail;
      this.tail.next = node;
      this.tail = node;
    }
    this.current = node;
    this.length++;
  }

  stepBackward() {
    if (this.current && this.current.prev) {
      this.current = this.current.prev;
      return this.current.data;
    }
    return null;
  }

  stepForward() {
    if (this.current && this.current.next) {
      this.current = this.current.next;
      return this.current.data;
    }
    return null;
  }

  getCurrent() {
    return this.current ? this.current.data : null;
  }

  clear() {
    this.head = null;
    this.tail = null;
    this.current = null;
    this.length = 0;
  }

  toArray() {
    var result = [];
    var node = this.head;
    while (node !== null) {
      result[result.length] = node.data;
      node = node.next;
    }
    return result;
  }
}
