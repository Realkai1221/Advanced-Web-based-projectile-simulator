// doubly linked list for aim undo/redo

class AimHistory {
  constructor() {
    this.list = new DoublyLinkedList();
  }

  record(angle, power) {
    // if the player already undid some changes and then makes a new one,
    // we need to throw away the "future" entries they undid past
    // I do this by rebuilding the list up to where current is
    if (this.list.current && this.list.current.next) {
      var data = [];
      var node = this.list.head;
      while (node && node !== this.list.current.next) {
        data[data.length] = node.data;
        node = node.next;
      }
      this.list.clear();
      for (var i = 0; i < data.length; i++) {
        this.list.insertAtTail(data[i]);
      }
    }

    this.list.insertAtTail({ angle, power });
  }

  undo() {
    return this.list.stepBackward();
  }

  redo() {
    return this.list.stepForward();
  }

  getCurrent() {
    return this.list.getCurrent();
  }

  clear() {
    this.list.clear();
  }
}
