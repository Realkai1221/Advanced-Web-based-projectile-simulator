
class GameController {
  constructor() {
    this.renderer = null;
    this.simEnv = null;
    this.terrainPoints = null;
    this.terrainBST = null;

    this.turnQueue = new Queue();
    this.aimHistory = new AimHistory();

    this.worldWidth = 200;
    this.players = {
      1: { id: 1, label: 'P1', colour: '#3498db', baseX: 0, baseY: 20, score: 0 },
      2: { id: 2, label: 'P2', colour: '#e94560', baseX: 0, baseY: 20, score: 0 }
    };

    this.currentPlayer = null;
    this.state = 'waiting';
    this.projectile = null;
    this.impactPoint = null;
    this.roundNumber = 1;
    this.winsToEnd = 3;
    this.hitRadius = 8;
    this.isRunning = false;
    this.lastFrameTime = null;
    this.leaderboard = null;

    this.ghostTrails = [];

    this.playerStats = {
      1: { totalShots: 0, totalMissDistance: 0, fastestHitMs: null },
      2: { totalShots: 0, totalMissDistance: 0, fastestHitMs: null }
    };
    this.shotStartTime = null;
    this.gameSessionId = null;

    this.savedAim = {
      1: { angle: 45, velocity: 30 },
      2: { angle: 45, velocity: 30 }
    };

    // this was causing a bug where undo would re-record itself, see _recordAim
    this._restoringAim = false;

    // who shoots first this round + did anyone hit yet
    this.roundFirstPlayer = 1;
    this.roundHits = { 1: null, 2: null }; // null = no hit, number = horizontal distance from target
  }

  // sets up the game for terrain, sliders, first turn
  init() {
    var canvas = document.getElementById('gameCanvas');
    this.renderer = new GameRenderer(canvas, this.worldWidth, 100);

    this.simEnv = new SimulationEnvironment(9.81, 0.005);
    this.simEnv.collisionResolver.groundLevel = -10;

    this._makeTerrain();

    this.angleSlider = document.getElementById('gameAngle');
    this.velocitySlider = document.getElementById('gameVelocity');
    this.angleLabel = document.getElementById('gameAngleValue');
    this.velocityLabel = document.getElementById('gameVelocityValue');
    this.feedbackEl = document.getElementById('feedbackText');

    this.angleSlider.addEventListener('input', () => {
      this.angleLabel.textContent = this.angleSlider.value + '°';
      this._recordAim();
      this._drawFrame();
    });
    this.velocitySlider.addEventListener('input', () => {
      this.velocityLabel.textContent = this.velocitySlider.value + ' m/s';
      this._recordAim();
      this._drawFrame();
    });

    document.getElementById('gameFireBtn').addEventListener('click', () => this.fire());
    document.getElementById('undoAimBtn').addEventListener('click', () => this._undoAim());
    document.getElementById('redoAimBtn').addEventListener('click', () => this._redoAim());
    document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());

    var lbContainer = document.getElementById('leaderboardSection');
    this.leaderboard = new Leaderboard(lbContainer);

    this._initRound();
    this._startSession();
    this._startTurn();
    this._drawFrame();
  }

  // put the players into the queue for this round
  _initRound() {
    this.turnQueue = new Queue();
    this.turnQueue.enqueue(this.roundFirstPlayer);
    this.turnQueue.enqueue(this.roundFirstPlayer === 1 ? 2 : 1);
    this.roundHits = { 1: null, 2: null };
  }

  // launches a projectile from the current players base
  fire() {
    if (this.state !== 'aiming') return;
    this.state = 'firing';

    var angle = parseFloat(this.angleSlider.value);
    var velocity = parseFloat(this.velocitySlider.value);
    var player = this.players[this.currentPlayer];

    // P1 fires right (+1), P2 fires left (-1)
    var direction = this.currentPlayer === 1 ? 1 : -1;
    var angleRad = angle * Math.PI / 180;
    var vx = direction * velocity * Math.cos(angleRad);
    var vy = velocity * Math.sin(angleRad);

    var launchY = player.baseY + 5;
    var state = new PhysicsState(player.baseX, launchY, vx, vy, 1);
    this.projectile = new Projectile('game_proj', state, new NoDrag());
    this.simEnv.addEntity(this.projectile);

    this.impactPoint = null;
    this.feedbackEl.textContent = '';
    this.shotStartTime = performance.now();
    this.playerStats[this.currentPlayer].totalShots++;
    this._toggleControls(false);

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this._animate();
  }

  // runs every frame while a projectile is in flight
  _animate() {
    if (!this.isRunning) return;

    var now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    if (dt > 0.1) dt = 0.1;

    this.simEnv.tick(dt);

    // check if projectile has gone out of bounds or hit the terrain
    if (this.projectile && this.projectile.isActive) {
      var px = this.projectile.x;
      var py = this.projectile.y;

      if (px < -10 || px > this.worldWidth + 10 || py < -50) {
        this.projectile.setActive(false);
        this.impactPoint = { x: px, y: 0 };
      } else if (this.terrainBST.isBelow(px, py)) {
        this.projectile.setActive(false);
        var groundY = this.terrainBST.getHeightAt(px);
        this.projectile.y = groundY;
        this.projectile.physicsState.y = groundY;
        this.impactPoint = { x: px, y: groundY };
        this.projectile.trajectoryRecorder.recordImpact(px, groundY);
      }
    }

    this._drawFrame();

    if (this.projectile && this.projectile.isActive) {
      requestAnimationFrame(() => this._animate());
    } else {
      this.isRunning = false;
      this._landed();
    }
  }

  _landed() {
    this.state = 'shotLanded';
    var player = this.players[this.currentPlayer];
    var opponentId = this.currentPlayer === 1 ? 2 : 1;
    var opponent = this.players[opponentId];

    // keep the trail 
    if (this.projectile) {
      this.ghostTrails[this.ghostTrails.length] = {
        points: this.projectile.trajectoryRecorder.getPoints(),
        colour: player.colour,
        impact: this.impactPoint ? { x: this.impactPoint.x, y: this.impactPoint.y } : null
      };
    }

    if (!this.impactPoint) {
      this.feedbackEl.textContent = 'Shot went out of bounds!';
      this._checkRound();
      return;
    }

    var dx = this.impactPoint.x - opponent.baseX;
    var horizontalDist = Math.abs(dx);
    var fullDistance = Math.sqrt(dx * dx + (this.impactPoint.y - opponent.baseY) ** 2);

    this.playerStats[this.currentPlayer].totalMissDistance += fullDistance;

    var isHit = horizontalDist <= this.hitRadius;

    if (isHit) {
      // remember the fastest hit for the leaderboard
      var hitMs = Math.round(performance.now() - this.shotStartTime);
      var stats = this.playerStats[this.currentPlayer];
      if (!stats.fastestHitMs || hitMs < stats.fastestHitMs) {
        stats.fastestHitMs = hitMs;
      }

      // save how close it was for the contesting shot comparison
      this.roundHits[this.currentPlayer] = horizontalDist;

      this.feedbackEl.innerHTML =
        `<strong>HIT!</strong> ${player.label} landed ${horizontalDist.toFixed(1)}m from target ` +
        `| Landing: (${Math.round(this.impactPoint.x)}, ${Math.round(this.impactPoint.y)})`;
      this.feedbackEl.className = 'feedback-text hit';
    } else {
      // tell them which direction they missed
      let hint = '';
      if (this.currentPlayer === 1) {
        hint = this.impactPoint.x < opponent.baseX ? 'Too short — increase velocity or angle' : 'Too far — decrease velocity or angle';
      } else {
        hint = this.impactPoint.x > opponent.baseX ? 'Too short — increase velocity or angle' : 'Too far — decrease velocity or angle';
      }

      this.feedbackEl.innerHTML =
        `Missed by <strong>${horizontalDist.toFixed(1)}m</strong> ` +
        `(${dx > 0 ? 'right' : 'left'} of target) ` +
        `| Landing: <strong>(${Math.round(this.impactPoint.x)}, ${Math.round(this.impactPoint.y)})</strong> ` +
        `| ${hint}`;
      this.feedbackEl.className = 'feedback-text miss';
    }

    this._drawFrame();
    this._checkRound();
  }

  // figuring out what happens after each shot
  _checkRound() {
    var firstPlayer = this.roundFirstPlayer;
    var secondPlayer = firstPlayer === 1 ? 2 : 1;
    var firstHit = this.roundHits[firstPlayer];
    var secondHit = this.roundHits[secondPlayer];

    // second player just shot and hit
    if (this.currentPlayer === secondPlayer && secondHit !== null) {
      if (firstHit !== null) {
        // both hit 
        this._bothHit(firstPlayer, secondPlayer);
      } else {
        // only second player hit, they win
        this._winRound(secondPlayer, `${this.players[secondPlayer].label} wins the round!`);
      }
      return;
    }

    // first player hit, check second
    if (this.currentPlayer === firstPlayer && firstHit !== null) {
      this.feedbackEl.innerHTML += ` — ${this.players[secondPlayer].label} gets a contesting shot!`;
      this._nextTurn();
      return;
    }

    // second player had their contesting shot and missed
    if (this.currentPlayer === secondPlayer && firstHit !== null && secondHit === null) {
      this._winRound(firstPlayer, `${this.players[firstPlayer].label} wins the round!`);
      return;
    }

    // nobody hit yet, keep going
    this._nextTurn();
  }

  _bothHit(firstPlayer, secondPlayer) {
    var dist1 = this.roundHits[firstPlayer];
    var dist2 = this.roundHits[secondPlayer];

    if (Math.abs(dist1 - dist2) < 0.01) {
      // same distance, no points
      this.feedbackEl.innerHTML =
        `Both players hit at equal distance (${dist1.toFixed(1)}m) — no point awarded!`;
      this.feedbackEl.className = 'feedback-text miss';
      this._nextRound(null);
    } else if (dist1 < dist2) {
      this._winRound(firstPlayer,
        `${this.players[firstPlayer].label} closer (${dist1.toFixed(1)}m vs ${dist2.toFixed(1)}m) — wins the round!`);
    } else {
      this._winRound(secondPlayer,
        `${this.players[secondPlayer].label} closer (${dist2.toFixed(1)}m vs ${dist1.toFixed(1)}m) — wins the round!`);
    }
  }

  _winRound(playerId, message) {
    this.players[playerId].score++;
    this._updateScoreboard();

    this.feedbackEl.innerHTML = message;
    this.feedbackEl.className = 'feedback-text hit';

    if (this.players[playerId].score >= this.winsToEnd) {
      setTimeout(() => this._endGame(this.players[playerId]), 2000);
    } else {
      this._nextRound(playerId);
    }
  }

  // new round 
  _nextRound(roundWinnerId) {
    setTimeout(() => {
      // swap who goes first so its fair
      this.roundFirstPlayer = this.roundFirstPlayer === 1 ? 2 : 1;
      this.roundNumber++;

     
      if (this.projectile) {
        this.simEnv.removeEntity(this.projectile.getId());
      }
      this.projectile = null;
      this.impactPoint = null;
      this.ghostTrails = [];

      // terrain for the new round
      this._makeTerrain();
      this.simEnv = new SimulationEnvironment(9.81, 0.005);
      this.simEnv.collisionResolver.groundLevel = -10;

      // back to default aim
      this.savedAim = {
        1: { angle: 45, velocity: 30 },
        2: { angle: 45, velocity: 30 }
      };

      this.feedbackEl.textContent = '';
      this.feedbackEl.className = 'feedback-text';

      this._initRound();
      this._startTurn();
      this._drawFrame();
    }, 3000);
  }

  _nextTurn() {
    setTimeout(() => {
      if (this.projectile) {
        this.simEnv.removeEntity(this.projectile.getId());
      }

      // remember their aim settings so they get them back on their next turn
      this.savedAim[this.currentPlayer] = {
        angle: parseFloat(this.angleSlider.value),
        velocity: parseFloat(this.velocitySlider.value)
      };

      var finished = this.turnQueue.dequeue();
      this.turnQueue.enqueue(finished);
      this._startTurn();
    }, 2500);
  }

  _startTurn() {
    this.currentPlayer = this.turnQueue.peek();
    this.state = 'aiming';
    this.projectile = null;
    this.impactPoint = null;
    this.aimHistory.clear();

    var aim = this.savedAim[this.currentPlayer];
    this._restoringAim = true;
    this.angleSlider.value = aim.angle;
    this.velocitySlider.value = aim.velocity;
    this.angleLabel.textContent = aim.angle + '°';
    this.velocityLabel.textContent = aim.velocity + ' m/s';
    this._restoringAim = false;

    this._toggleControls(true);
    this._updateTurn();
    this._updateInfo();
    this._drawFrame();
  }

  _recordAim() {
    if (this.state !== 'aiming') return;
    if (this._restoringAim) return;
    this.aimHistory.record(
      parseFloat(this.angleSlider.value),
      parseFloat(this.velocitySlider.value)
    );
  }

  _undoAim() {
    var prev = this.aimHistory.undo();
    if (prev) {
      this._restoringAim = true;
      this.angleSlider.value = prev.angle;
      this.velocitySlider.value = prev.power;
      this.angleLabel.textContent = prev.angle + '°';
      this.velocityLabel.textContent = prev.power + ' m/s';
      this._restoringAim = false;
      this._drawFrame();
    }
  }

  _redoAim() {
    var next = this.aimHistory.redo();
    if (next) {
      this._restoringAim = true;
      this.angleSlider.value = next.angle;
      this.velocitySlider.value = next.power;
      this.angleLabel.textContent = next.angle + '°';
      this.velocityLabel.textContent = next.power + ' m/s';
      this._restoringAim = false;
      this._drawFrame();
    }
  }

  _drawFrame() {
    this.renderer.clear();
    this.renderer.drawDistanceRuler();
    this.renderer.drawTerrain(this.terrainPoints);

    // old trails
    for (let i = 0; i < this.ghostTrails.length; i++) {
      var ghost = this.ghostTrails[i];
      this.renderer.drawTrajectory(ghost.points, ghost.colour, 0.2);
      if (ghost.impact) {
        this.renderer.ctx.globalAlpha = 0.3;
        this.renderer.drawImpact(ghost.impact.x, ghost.impact.y);
        this.renderer.ctx.globalAlpha = 1.0;
      }
    }

    var p1 = this.players[1];
    var p2 = this.players[2];
    this.renderer.drawBase(p1.baseX, p1.baseY, p1.colour, p1.label);
    this.renderer.drawBase(p2.baseX, p2.baseY, p2.colour, p2.label);

    if (this.state === 'aiming' && this.currentPlayer) {
      var opponentId = this.currentPlayer === 1 ? 2 : 1;
      var opp = this.players[opponentId];
      this.renderer.drawTargetZone(opp.baseX, opp.baseY, this.hitRadius);
    }

    if (this.state === 'aiming' && this.currentPlayer) {
      var player = this.players[this.currentPlayer];
      var angle = parseFloat(this.angleSlider.value);
      var velocity = parseFloat(this.velocitySlider.value);
      var direction = this.currentPlayer === 1 ? 1 : -1;

      this.renderer.drawProtractor(
        player.baseX, player.baseY + 5,
        angle, direction, player.colour
      );

      var displayAngle = this.currentPlayer === 1 ? angle : 180 - angle;
      this.renderer.drawAimIndicator(
        player.baseX, player.baseY + 5,
        displayAngle, velocity, player.colour
      );
    }

    if (this.projectile) {
      var trail = this.projectile.trajectoryRecorder.getPoints();
      var player = this.players[this.currentPlayer];
      this.renderer.drawTrajectory(trail, player.colour, 0.8);
      this.renderer.drawProjectile(this.projectile.x, this.projectile.y, player.colour);
    }

    if (this.impactPoint) {
      this.renderer.drawImpact(this.impactPoint.x, this.impactPoint.y);
    }
  }

  _updateInfo() {
    var p1 = this.players[1];
    var p2 = this.players[2];
    var dist = Math.abs(p2.baseX - p1.baseX);

    var infoEl = document.getElementById('gameInfoDisplay');
    if (infoEl) {
      infoEl.innerHTML =
        `<span class="p1-colour">P1 (${Math.round(p1.baseX)}, ${Math.round(p1.baseY)})</span>` +
        `<span class="info-distance">Distance: <strong>${Math.round(dist)}m</strong></span>` +
        `<span class="p2-colour">P2 (${Math.round(p2.baseX)}, ${Math.round(p2.baseY)})</span>`;
    }
  }

  _updateScoreboard() {
    document.getElementById('p1Score').textContent = this.players[1].score;
    document.getElementById('p2Score').textContent = this.players[2].score;
  }

  _updateTurn() {
    var indicator = document.getElementById('turnIndicator');
    var player = this.players[this.currentPlayer];
    indicator.textContent = `${player.label}'s Turn`;
    indicator.style.color = player.colour;
    document.getElementById('roundCounter').textContent = `Round ${this.roundNumber}`;
  }

  _toggleControls(enabled) {
    this.angleSlider.disabled = !enabled;
    this.velocitySlider.disabled = !enabled;
    document.getElementById('gameFireBtn').disabled = !enabled;
    document.getElementById('undoAimBtn').disabled = !enabled;
    document.getElementById('redoAimBtn').disabled = !enabled;
  }

  _endGame(winner) {
    console.log('_endGame called:', winner.label, 'wins with score', winner.score);
    this.state = 'gameOver';
    this._toggleControls(false);

    var overlay = document.getElementById('gameOverOverlay');
    document.getElementById('winnerText').textContent = `${winner.label} Wins!`;
    document.getElementById('finalScore').textContent =
      `${this.players[1].score} - ${this.players[2].score}`;
    overlay.classList.remove('hidden');

    this.leaderboard.show();
    this._saveResult(winner);
  }

  _randomiseBases() {
    this.players[1].baseX = 22 + Math.random() * 34;
    this.players[2].baseX = 144 + Math.random() * 34;
  }

  _makeTerrain() {
    var maxAttempts = 10;
    var maxVelocity = 50;
    var maxHeightDiff = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this._randomiseBases();

      // random heights for each player but dont make the difference too extreme
      let p1Height = 20 + Math.random() * 25;
      let p2Height = 20 + Math.random() * 25;
      if (Math.abs(p1Height - p2Height) > maxHeightDiff) {
        // pull them closer together if theyre too far apart
        var avg = (p1Height + p2Height) / 2;
        p1Height = avg + Math.sign(p1Height - avg) * (maxHeightDiff / 2);
        p2Height = avg + Math.sign(p2Height - avg) * (maxHeightDiff / 2);
      }
      p1Height = Math.round(p1Height * 10) / 10;
      p2Height = Math.round(p2Height * 10) / 10;

      var roughnessOverride = attempt >= 7 ? 15 : null;
      this.terrainPoints = generateGameTerrain(
        this.worldWidth, this.players[1].baseX, this.players[2].baseX,
        15, roughnessOverride, p1Height, p2Height
      );

      this.terrainBST = new TerrainBST(this.terrainPoints);
      this.players[1].baseY = this.terrainBST.getHeightAt(this.players[1].baseX);
      this.players[2].baseY = this.terrainBST.getHeightAt(this.players[2].baseX);

      var p1CanReach = this._canReach(
        this.players[1].baseX, this.players[1].baseY + 5, this.players[2].baseX, 1, maxVelocity
      );
      var p2CanReach = this._canReach(
        this.players[2].baseX, this.players[2].baseY + 5, this.players[1].baseX, -1, maxVelocity
      );

      if (p1CanReach && p2CanReach) return;
    }
  }

  _canReach(startX, startY, targetX, direction, maxVelocity) {
    var dt = 0.01;
    var g = 9.81;

    for (let angleDeg = 30; angleDeg <= 70; angleDeg += 5) {
      var angleRad = angleDeg * Math.PI / 180;
      let x = startX;
      let y = startY;
      let vx = direction * maxVelocity * Math.cos(angleRad);
      let vy = maxVelocity * Math.sin(angleRad);

      for (let step = 0; step < 5000; step++) {
        vy -= g * dt;
        x += vx * dt;
        y += vy * dt;

        if (x < 0 || x > this.worldWidth || y < -10) break;
        if (this.terrainBST.isBelow(x, y)) break;
        if (Math.abs(x - targetX) <= this.hitRadius) return true;
      }
    }
    return false;
  }

  async _startSession() {
    if (!api.isLoggedIn()) return;
    var userId = api.getUserId();
    var result = await api.post('/api/game/create', {
      player1Id: userId,
      player2Id: userId
    });
    this.gameSessionId = result.sessionId;
  }

  async _saveResult(winner) {
    if (!api.isLoggedIn() || !this.gameSessionId) return;
    var userId = api.getUserId();
    await api.post('/api/game/result', {
      sessionId: this.gameSessionId,
      winnerId: userId,
      players: [{
        userId: userId,
        wins: this.players[1].score + this.players[2].score,
        totalShots: this.playerStats[1].totalShots + this.playerStats[2].totalShots,
        totalMissDistance: this.playerStats[1].totalMissDistance + this.playerStats[2].totalMissDistance,
        fastestHitMs: Math.min(
          this.playerStats[1].fastestHitMs || 999999,
          this.playerStats[2].fastestHitMs || 999999
        )
      }]
    });
  }

  newGame() {
    this.players[1].score = 0;
    this.players[2].score = 0;
    this.roundNumber = 1;
    this.roundFirstPlayer = 1;
    this._updateScoreboard();

    this.ghostTrails = [];
    this.projectile = null;
    this.impactPoint = null;
    this.isRunning = false;

    document.getElementById('gameOverOverlay').classList.add('hidden');
    this.leaderboard.hide();

    this._makeTerrain();

    this.simEnv = new SimulationEnvironment(9.81, 0.005);
    this.simEnv.collisionResolver.groundLevel = -10;

    this.feedbackEl.textContent = '';
    this.feedbackEl.className = 'feedback-text';

    this.playerStats = {
      1: { totalShots: 0, totalMissDistance: 0, fastestHitMs: null },
      2: { totalShots: 0, totalMissDistance: 0, fastestHitMs: null }
    };
    this.savedAim = {
      1: { angle: 45, velocity: 30 },
      2: { angle: 45, velocity: 30 }
    };

    this._initRound();
    this._startSession();
    this._startTurn();
    this._drawFrame();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  var game = new GameController();
  game.init();
});
