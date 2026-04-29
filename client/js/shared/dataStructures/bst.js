class BSTNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.left = null;
    this.right = null;
  }
}


class BinarySearchTree {
  constructor() {
    this.root = null;
    this.size = 0;
  }

  insert(key, value) {
    this.root = this._insert(this.root, key, value);
  }

  _insert(node, key, value) {
    if (node === null) {
      this.size++;
      return new BSTNode(key, value);
    }
    if (key < node.key) node.left = this._insert(node.left, key, value);
    else if (key > node.key) node.right = this._insert(node.right, key, value);
    else node.value = value;
    return node;
  }

  search(key) {
    var node = this._find(this.root, key);
    return node ? node.value : null;
  }

  _find(node, key) {
    if (node === null) return null;
    if (key === node.key) return node;
    if (key < node.key) return this._find(node.left, key);
    return this._find(node.right, key);
  }

  // find the biggest key which is still <= what we want if theres an exact match return it, otherwise go right to see if theres something closer but still <=
  floor(key, node) {
    if (node === undefined) node = this.root;
    if (node === null) return null;
    if (key === node.key) return node;

    if (key < node.key) return this.floor(key, node.left);

    var r = this.floor(key, node.right);
    return r !== null ? r : node;
  }

  // opposite of floor which is the smallest key thats >= what we want
  ceiling(key, node) {
    if (node === undefined) node = this.root;
    if (node === null) return null;
    if (key === node.key) return node;

    if (key > node.key) return this.ceiling(key, node.right);

    var l = this.ceiling(key, node.left);
    return l !== null ? l : node;
  }

  delete(key) {
    this.root = this._remove(this.root, key);
  }

  // three cases to handle: no children, one child (bypass it), two children (find next one)
  _remove(node, key) {
    if (node === null) return null;

    if (key < node.key) {
      node.left = this._remove(node.left, key);
    } else if (key > node.key) {
      node.right = this._remove(node.right, key);
    } else {
      this.size--;
      if (node.left === null && node.right === null) return null;
      if (node.left === null) return node.right;
      if (node.right === null) return node.left;

      // two children then replace with the next one
      var succ = this._min(node.right);
      node.key = succ.key;
      node.value = succ.value;
      node.right = this._remove(node.right, succ.key);
      this.size++; // undo the extra decrement from recursive call
    }
    return node;
  }

  _min(node) {
    while (node.left !== null) node = node.left;
    return node;
  }

  inOrderTraversal(cb) {
    this._inOrder(this.root, cb);
  }

  _inOrder(node, cb) {
    if (node === null) return;
    this._inOrder(node.left, cb);
    cb(node.key, node.value);
    this._inOrder(node.right, cb);
  }
}
