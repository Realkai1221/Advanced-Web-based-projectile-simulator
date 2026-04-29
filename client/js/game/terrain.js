// I looked up fractal terrain generation and midpoint displacement for making gaming terrain

function generateTerrain(left, right, roughness, depth) {
  if (depth === 0) return [left, right];

  var midX = (left.x + right.x) / 2;
  var midY = (left.y + right.y) / 2 + (Math.random() * 2 - 1) * roughness;
  // dont let terrain go below 5m 
  var mid = { x: midX, y: Math.max(5, midY) };

  var newRoughness = roughness * 0.55;

  var leftHalf = generateTerrain(left, mid, newRoughness, depth - 1);
  var rightHalf = generateTerrain(mid, right, newRoughness, depth - 1);

  // join the two halves but skip the duplicate midpoint
  var combined = [];
  for (var i = 0; i < leftHalf.length; i++) {
    combined[combined.length] = leftHalf[i];
  }
  for (var i = 1; i < rightHalf.length; i++) {
    combined[combined.length] = rightHalf[i];
  }
  return combined;
}

// wrapper that generates terrain and flattens the areas where players stand
function generateGameTerrain(worldWidth, p1BaseX, p2BaseX, baseWidth, roughnessOverride, p1Height, p2Height) {
  if (!baseWidth) baseWidth = 15;
  if (!p1Height) p1Height = 20;
  if (!p2Height) p2Height = 20;

  var avgHeight = (p1Height + p2Height) / 2;
  var roughness = roughnessOverride ? roughnessOverride : 45;

  var points = generateTerrain(
    { x: 0, y: avgHeight },
    { x: worldWidth, y: avgHeight },
    roughness,
    9 // Depth of recursion 
  );

  // flatten terrain under each player's base 
  var halfBase = baseWidth / 2;
  for (var i = 0; i < points.length; i++) {
    if (points[i].x >= p1BaseX - halfBase && points[i].x <= p1BaseX + halfBase) {
      points[i].y = p1Height;
    }
    if (points[i].x >= p2BaseX - halfBase && points[i].x <= p2BaseX + halfBase) {
      points[i].y = p2Height;
    }
  }

  return points;
}
