class CanvasRenderer {
  constructor(canvas, worldWidth, worldHeight) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.worldWidth = worldWidth || 200;
    this.worldHeight = worldHeight || 100;

    this.scaleX = canvas.width / this.worldWidth;
    this.scaleY = canvas.height / this.worldHeight;
  }

  // flip y axis as physics y=0 is at the bottom but canvas y=0 is at the top
  worldToScreen(wx, wy) {
    return {
      sx: wx * this.scaleX,
      sy: this.canvas.height - (wy * this.scaleY)
    };
  }

  screenToWorld(sx, sy) {
    return {
      wx: sx / this.scaleX,
      wy: (this.canvas.height - sy) / this.scaleY
    };
  }

  clear() {
    this.ctx.fillStyle = '#f0f0f0';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGround() {
    var ground = this.worldToScreen(0, 0);
    this.ctx.strokeStyle = '#2ecc71';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, ground.sy);
    this.ctx.lineTo(this.canvas.width, ground.sy);
    this.ctx.stroke();
  }

  // faint lines so you can estimate distances visually
  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    this.ctx.lineWidth = 1;

    var spacing = this._gridSpacing();

    for (var wx = spacing; wx < this.worldWidth; wx += spacing) {
      var pos = this.worldToScreen(wx, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.sx, 0);
      this.ctx.lineTo(pos.sx, this.canvas.height);
      this.ctx.stroke();
    }

    for (var wy = spacing; wy < this.worldHeight; wy += spacing) {
      var pos = this.worldToScreen(0, wy);
      this.ctx.beginPath();
      this.ctx.moveTo(0, pos.sy);
      this.ctx.lineTo(this.canvas.width, pos.sy);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    this.ctx.font = '10px system-ui';
    for (var wx = spacing; wx < this.worldWidth; wx += spacing) {
      var pos = this.worldToScreen(wx, 0);
      this.ctx.fillText(wx + 'm', pos.sx + 2, pos.sy - 4);
    }
  }

  // picks a round number for grid spacing 
  _gridSpacing() {
    var target = this.worldWidth / 8;
    var mag = Math.pow(10, Math.floor(Math.log10(target)));
    var residual = target / mag;
    if (residual < 2) return mag;
    if (residual < 5) return 2 * mag;
    return 5 * mag;
  }

  drawProjectile(x, y, colour) {
    if (!colour) colour = '#e94560';
    var screen = this.worldToScreen(x, y);
    this.ctx.fillStyle = colour;
    this.ctx.beginPath();
    this.ctx.arc(screen.sx, screen.sy, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // draw a line through all the recorded points
  drawTrajectory(points, colour, opacity) {
    if (points.length < 2) return;
    if (!colour) colour = '#e94560';
    if (opacity === undefined) opacity = 1.0;

    this.ctx.strokeStyle = colour;
    this.ctx.globalAlpha = opacity;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    var first = this.worldToScreen(points[0].x, points[0].y);
    this.ctx.moveTo(first.sx, first.sy);

    for (var i = 1; i < points.length; i++) {
      if (points[i].impact) continue; // dont draw a line to impact markers
      var pt = this.worldToScreen(points[i].x, points[i].y);
      this.ctx.lineTo(pt.sx, pt.sy);
    }
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;

    var last = points[points.length - 1];
    if (last.impact) {
      this._drawImpact(last.x, last.y, colour);
    }
  }

  _drawImpact(x, y, colour) {
    var screen = this.worldToScreen(x, y);
    this.ctx.strokeStyle = colour;
    this.ctx.lineWidth = 2;
    var s = 6;
    this.ctx.beginPath();
    this.ctx.moveTo(screen.sx - s, screen.sy - s);
    this.ctx.lineTo(screen.sx + s, screen.sy + s);
    this.ctx.moveTo(screen.sx + s, screen.sy - s);
    this.ctx.lineTo(screen.sx - s, screen.sy + s);
    this.ctx.stroke();
  }

  drawObstacle(obstacle) {
    var box = obstacle.getBoundingBox();
    var tl = this.worldToScreen(box.left, box.top);
    var br = this.worldToScreen(box.right, box.bottom);

    var w = br.sx - tl.sx;
    var h = br.sy - tl.sy;

    this.ctx.fillStyle = '#c0c8d8';
    this.ctx.strokeStyle = '#4a7ebf';
    this.ctx.lineWidth = 1;
    this.ctx.fillRect(tl.sx, tl.sy, w, h);
    this.ctx.strokeRect(tl.sx, tl.sy, w, h);
  }

  // crosshair with a circle showing the success threshold radius
  drawTarget(target) {
    var screen = this.worldToScreen(target.x, target.y);
    var r = target.radius * this.scaleX;

    this.ctx.strokeStyle = '#f39c12';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(screen.sx, screen.sy, r, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(screen.sx - r - 3, screen.sy);
    this.ctx.lineTo(screen.sx + r + 3, screen.sy);
    this.ctx.moveTo(screen.sx, screen.sy - r - 3);
    this.ctx.lineTo(screen.sx, screen.sy + r + 3);
    this.ctx.stroke();
  }

  // arrow showing direction and magnitude of velocity
  // vy has to be flipped because screen y is inverted from physics y
  drawVelocityArrow(x, y, vx, vy, scale) {
    if (!scale) scale = 0.3;
    var screen = this.worldToScreen(x, y);

    // have to flip vy because screen y is inverted
    var tipX = screen.sx + vx * scale * this.scaleX;
    var tipY = screen.sy - vy * scale * this.scaleY;

    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(screen.sx, screen.sy);
    this.ctx.lineTo(tipX, tipY);
    this.ctx.stroke();

    var angle = Math.atan2(tipY - screen.sy, tipX - screen.sx);
    var headLen = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(tipX, tipY);
    this.ctx.lineTo(tipX - headLen * Math.cos(angle - 0.4), tipY - headLen * Math.sin(angle - 0.4));
    this.ctx.moveTo(tipX, tipY);
    this.ctx.lineTo(tipX - headLen * Math.cos(angle + 0.4), tipY - headLen * Math.sin(angle + 0.4));
    this.ctx.stroke();
  }

  drawLaunchPoint(x, y) {
    var screen = this.worldToScreen(x, y);
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(screen.sx, screen.sy, 4, 0, Math.PI * 2);
    this.ctx.stroke();
  }
}
