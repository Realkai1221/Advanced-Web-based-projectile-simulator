// adjacency list using Map where each node id maps to an array of neighbours
// used for prerequisite chains and the visual prereq graph
class Graph {
  constructor() {
    this.adjacencyList = new Map();
  }

  addNode(id) {
    if (!this.adjacencyList.has(id)) {
      this.adjacencyList.set(id, []);
    }
  }

  addEdge(from, to) {
    if (!this.adjacencyList.has(from)) this.addNode(from);
    if (!this.adjacencyList.has(to)) this.addNode(to);
    this.adjacencyList.get(from)[this.adjacencyList.get(from).length] = to;
  }

  removeEdge(from, to) {
    var arr = this.adjacencyList.get(from);
    if (!arr) return;
    this.adjacencyList.set(from, arr.filter(n => n !== to));
  }

  getNeighbours(id) {
    return this.adjacencyList.get(id) || [];
  }

  // delete if theres a cycle 
  topologicalSort() {
    var visited = new Set();
    var inStack = new Set();
    var result = [];

    for (var node of this.adjacencyList.keys()) {
      if (!visited.has(node)) {
        if (!this._dfs(node, visited, inStack, result)) {
          throw new Error('Cycle detected');
        }
      }
    }
    return result;
  }

  // visited means fully done,
  // inStack means were currently exploring from this node
  // if we hit something thats in inStack we've gone in a circle
  _dfs(node, visited, inStack, result) {
    if (inStack.has(node)) return false;
    if (visited.has(node)) return true;

    inStack.add(node);
    var neighbours = this.adjacencyList.get(node) || [];
    for (var i = 0; i < neighbours.length; i++) {
      if (!this._dfs(neighbours[i], visited, inStack, result)) return false;
    }
    inStack.delete(node);
    visited.add(node);
    result.unshift(node);
    return true;
  }
}
