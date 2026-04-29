class TerrainBST {
  constructor(terrainPoints) {
    this.bst = new BinarySearchTree();
    for (var i = 0; i < terrainPoints.length; i++) {
      this.bst.insert(terrainPoints[i].x, terrainPoints[i].y);
    }
  }

  getHeightAt(x) {
    var leftNode = this.bst.floor(x);
    var rightNode = this.bst.ceiling(x);

    if (!leftNode && !rightNode) return 0;
    if (!leftNode) return rightNode.value;
    if (!rightNode) return leftNode.value;
    if (leftNode.key === rightNode.key) return leftNode.value;

    // interpolate between the two closest terrain points
    var t = (x - leftNode.key) / (rightNode.key - leftNode.key);
    return leftNode.value + t * (rightNode.value - leftNode.value);
  }

  isBelow(x, y) {
    return y <= this.getHeightAt(x);
  }
}
