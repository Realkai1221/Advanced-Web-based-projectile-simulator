// most of this is straightforward canvas drawing 
class GameRenderer {
  constructor(canvas, worldWidth = 200, worldHeight = 100) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.scaleX = canvas.width / worldWidth;
    this.scaleY = canvas.height / worldHeight;
  }

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
    this.ctx.fillStyle = '#dbe8f0';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // draw terrain as a filled shape
  drawTerrain(points) {
    if (points.length < 2) return;

    this.ctx.beginPath();
    var first = this.worldToScreen(points[0].x, points[0].y);
    this.ctx.moveTo(first.sx, first.sy);

    for (let i = 1; i < points.length; i++) {
      var { sx, sy } = this.worldToScreen(points[i].x, points[i].y);
      this.ctx.lineTo(sx, sy);
    }

    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.lineTo(0, this.canvas.height);
    this.ctx.closePath();

    this.ctx.fillStyle = '#5a9a50';
    this.ctx.fill();

    this.ctx.strokeStyle = '#3a7a33';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.moveTo(first.sx, first.sy);
    for (let i = 1; i < points.length; i++) {
      var { sx, sy } = this.worldToScreen(points[i].x, points[i].y);
      this.ctx.lineTo(sx, sy);
    }
    this.ctx.stroke();
  }

  // interval lines to show distance
  drawDistanceRuler() {
    var ctx = this.ctx;
    var groundY = this.worldToScreen(0, 0).sy;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.font = '9px system-ui';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;

    // Tick marks every 20m, labels every 40m
    for (let wx = 0; wx <= this.worldWidth; wx += 20) {
      var { sx } = this.worldToScreen(wx, 0);
      var isMajor = wx % 40 === 0;
      var tickLen = isMajor ? 8 : 4;

      ctx.beginPath();
      ctx.moveTo(sx, groundY);
      ctx.lineTo(sx, groundY + tickLen);
      ctx.stroke();

      if (isMajor) {
        ctx.fillText(`${wx}m`, sx, groundY + tickLen + 10);
      }
    }
  }

  drawBase(x, y, colour, label) {
    var { sx, sy } = this.worldToScreen(x, y);

    this.ctx.fillStyle = colour;
    this.ctx.fillRect(sx - 15, sy - 2, 30, 4);

    this.ctx.strokeStyle = '#ccc';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(sx, sy - 2);
    this.ctx.lineTo(sx, sy - 30);
    this.ctx.stroke();

    // little triangle flag
    this.ctx.fillStyle = colour;
    this.ctx.beginPath();
    this.ctx.moveTo(sx, sy - 30);
    this.ctx.lineTo(sx + 15, sy - 24);
    this.ctx.lineTo(sx, sy - 18);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#222';
    this.ctx.font = 'bold 11px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, sx, sy - 34);

    this.ctx.font = '9px monospace';
    this.ctx.fillStyle = 'rgba(0,0,0,0.4)';
    this.ctx.fillText(`(${Math.round(x)}, ${Math.round(y)})`, sx, sy + 14);
  }

  drawProjectile(x, y, colour = '#e94560') {
    var { sx, sy } = this.worldToScreen(x, y);
    this.ctx.fillStyle = colour;
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, 4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawTrajectory(points, colour = '#e94560', opacity = 0.6) {
    if (points.length < 2) return;

    this.ctx.strokeStyle = colour;
    this.ctx.globalAlpha = opacity;
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    var first = this.worldToScreen(points[0].x, points[0].y);
    this.ctx.moveTo(first.sx, first.sy);

    for (let i = 1; i < points.length; i++) {
      if (points[i].impact) continue;
      var { sx, sy } = this.worldToScreen(points[i].x, points[i].y);
      this.ctx.lineTo(sx, sy);
    }
    this.ctx.stroke();
    this.ctx.globalAlpha = 1.0;
  }

  drawImpact(x, y) {
    var { sx, sy } = this.worldToScreen(x, y);

    // expanding rings that fade out 
    for (var r = 3; r <= 12; r += 3) {
      this.ctx.strokeStyle = `rgba(233, 69, 96, ${1 - r / 15})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = 'rgba(233, 69, 96, 0.8)';
    this.ctx.font = '9px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`(${Math.round(x)}, ${Math.round(y)})`, sx, sy - 16);
  }

  // the angle indicator thing around the players base
  drawProtractor(x, y, angleDeg, direction, colour) {
    var { sx, sy } = this.worldToScreen(x, y);
    var radius = 35;
    var ctx = this.ctx;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;

    var startAngle = direction === 1 ? 0 : Math.PI;
    var endAngle = direction === 1 ? -Math.PI / 2 : -Math.PI / 2;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, -Math.PI / 2, startAngle, direction !== 1);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.font = '8px system-ui';
    for (let deg = 0; deg <= 90; deg += 15) {
      var rad = deg * Math.PI / 180;
      var cosA = direction * Math.cos(rad);
      var sinA = Math.sin(rad);
      var innerR = radius - 3;
      var outerR = radius + 3;

      ctx.beginPath();
      ctx.moveTo(sx + cosA * innerR, sy - sinA * innerR);
      ctx.lineTo(sx + cosA * outerR, sy - sinA * outerR);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.stroke();

      if (deg % 30 === 0) {
        ctx.textAlign = 'center';
        ctx.fillText(`${deg}`, sx + cosA * (radius + 11), sy - sinA * (radius + 11) + 3);
      }
    }

    // coloured arc showing how far theyve aimed
    var aimRad = angleDeg * Math.PI / 180;
    ctx.strokeStyle = colour;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (direction === 1) {
      ctx.arc(sx, sy, radius, 0, -aimRad, true);
    } else {
      ctx.arc(sx, sy, radius, Math.PI, Math.PI + aimRad, false);
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  // dashed arrow showing where the shot will go
  drawAimIndicator(x, y, angleDeg, velocity, colour) {
    var { sx, sy } = this.worldToScreen(x, y);
    var angleRad = angleDeg * Math.PI / 180;
    var length = velocity * 0.8; // visual length scales with velocity

    var tipSx = sx + Math.cos(angleRad) * length;
    var tipSy = sy - Math.sin(angleRad) * length;

    this.ctx.strokeStyle = colour;
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 3]);
    this.ctx.beginPath();
    this.ctx.moveTo(sx, sy);
    this.ctx.lineTo(tipSx, tipSy);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    var angle = Math.atan2(tipSy - sy, tipSx - sx);
    var headLen = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(tipSx, tipSy);
    this.ctx.lineTo(tipSx - headLen * Math.cos(angle - 0.4), tipSy - headLen * Math.sin(angle - 0.4));
    this.ctx.moveTo(tipSx, tipSy);
    this.ctx.lineTo(tipSx - headLen * Math.cos(angle + 0.4), tipSy - headLen * Math.sin(angle + 0.4));
    this.ctx.stroke();
  }

  // circle around the enemy base showing how close you need to land
  drawTargetZone(x, y, radius) {
    var { sx, sy } = this.worldToScreen(x, y);
    var r = radius * this.scaleX;
    this.ctx.strokeStyle = 'rgba(243, 156, 18, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.beginPath();
    this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }
}
