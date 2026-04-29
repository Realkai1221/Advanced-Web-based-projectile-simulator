class PrereqGraphView {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.nodes = [];
    this.edges = [];
  }

  // takes the list of assignments and draws the graph
  render(assignments) {
    this.nodes = [];
    this.edges = [];

    if (!assignments || assignments.length === 0) {
      this._drawEmpty();
      return;
    }

    // build the graph so I can sort it left to right
    var graph = new Graph();
    for (var a of assignments) {
      graph.addNode(a.assignment_id);
    }
    for (var a of assignments) {
      if (a.prereqIds) {
        for (var reqId of a.prereqIds) {
          graph.addEdge(reqId, a.assignment_id);
        }
      }
    }

    // topological sort gives the order and if it fails theres a cycle
    let order;
    try {
      order = graph.topologicalSort();
    } catch (e) {
      order = assignments.map(a => a.assignment_id);
    }

    // Calculate depth (layer) for each node
    var depth = {};
    for (var id of order) {
      var a = assignments.find(x => x.assignment_id === id);
      if (!a) continue;
      var prereqs = a.prereqIds || [];
      if (prereqs.length === 0) {
        depth[id] = 0;
      } else {
        let maxParentDepth = 0;
        for (var reqId of prereqs) {
          if (depth[reqId] !== undefined && depth[reqId] >= maxParentDepth) {
            maxParentDepth = depth[reqId] + 1;
          }
        }
        depth[id] = maxParentDepth;
      }
    }

    // Group by depth for column layout
    var layers = {};
    let maxDepth = 0;
    for (var id of order) {
      var d = depth[id] || 0;
      if (!layers[d]) layers[d] = [];
      layers[d][layers[d].length] = id;
      if (d > maxDepth) maxDepth = d;
    }

    // Position nodes
    var nodeWidth = 120;
    var nodeHeight = 40;
    var hGap = 40;
    var vGap = 25;

    for (let d = 0; d <= maxDepth; d++) {
      var layer = layers[d] || [];
      var totalHeight = layer.length * (nodeHeight + vGap) - vGap;
      var startY = (this.canvas.height - totalHeight) / 2;

      for (let i = 0; i < layer.length; i++) {
        var id = layer[i];
        var a = assignments.find(x => x.assignment_id === id);
        if (!a) continue;

        this.nodes[this.nodes.length] = {
          id,
          label: a.name,
          x: 30 + d * (nodeWidth + hGap),
          y: startY + i * (nodeHeight + vGap),
          width: nodeWidth,
          height: nodeHeight,
          locked: a.locked || false
        };
      }
    }

    // Build edges
    for (var a of assignments) {
      if (!a.prereqIds) continue;
      for (var reqId of a.prereqIds) {
        var from = this.nodes.find(n => n.id === reqId);
        var to = this.nodes.find(n => n.id === a.assignment_id);
        if (from && to) {
          this.edges[this.edges.length] = { from, to };
        }
      }
    }

    this._draw();
  }

  _draw() {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw edges (arrows)
    for (var edge of this.edges) {
      var fromX = edge.from.x + edge.from.width;
      var fromY = edge.from.y + edge.from.height / 2;
      var toX = edge.to.x;
      var toY = edge.to.y + edge.to.height / 2;

      ctx.strokeStyle = '#4a7ebf';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Arrowhead
      var angle = Math.atan2(toY - fromY, toX - fromX);
      var headLen = 8;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLen * Math.cos(angle - 0.4), toY - headLen * Math.sin(angle - 0.4));
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLen * Math.cos(angle + 0.4), toY - headLen * Math.sin(angle + 0.4));
      ctx.stroke();
    }

    // Draw nodes
    for (var node of this.nodes) {
      var borderColor = node.locked ? '#aaa' : '#4a7ebf';
      var fillColor = node.locked ? '#e0e0e0' : '#d0dff0';
      var textColor = node.locked ? '#888' : '#222';

      // Rounded rect
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      this._roundRect(node.x, node.y, node.width, node.height, 6);

      // Label (truncate if too long)
      ctx.fillStyle = textColor;
      ctx.font = '11px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let label = node.label;
      if (ctx.measureText(label).width > node.width - 10) {
        while (ctx.measureText(label + '...').width > node.width - 10 && label.length > 3) {
          label = label.slice(0, -1);
        }
        label += '...';
      }
      ctx.fillText(label, node.x + node.width / 2, node.y + node.height / 2);
    }
  }

  _roundRect(x, y, w, h, r) {
    var ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawEmpty() {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#888';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('No assignments yet', this.canvas.width / 2, this.canvas.height / 2);
  }
}
