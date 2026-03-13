/**
 * Confidence Map Generator
 * Creates a spatial heatmap showing which regions of an image are likely AI-generated
 */

export function generateConfidenceMap(imageData, width, height, blockSize = 16) {
  if (!imageData || !width || !height) {
    return { grid: [], blockSize, width: 0, height: 0 };
  }

  const gridW = Math.ceil(width / blockSize);
  const gridH = Math.ceil(height / blockSize);
  const grid = [];

  for (let by = 0; by < gridH; by++) {
    const row = [];
    for (let bx = 0; bx < gridW; bx++) {
      const startX = bx * blockSize;
      const startY = by * blockSize;
      const endX = Math.min(startX + blockSize, width);
      const endY = Math.min(startY + blockSize, height);

      let noiseScore = 0;
      let edgeScore = 0;
      let colorVariance = 0;
      let pixelCount = 0;

      const reds = [], greens = [], blues = [];

      // Collect pixel data for this block
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * width + x) * 4;
          reds.push(imageData[idx]);
          greens.push(imageData[idx + 1]);
          blues.push(imageData[idx + 2]);
          pixelCount++;

          // Neighbor comparison for noise estimation
          if (x < endX - 1 && y < endY - 1) {
            const idxRight = (y * width + x + 1) * 4;
            const idxDown = ((y + 1) * width + x) * 4;

            const diffR = Math.abs(imageData[idx] - imageData[idxRight]);
            const diffD = Math.abs(imageData[idx] - imageData[idxDown]);

            noiseScore += diffR + diffD;

            // Edge detection (simplified Sobel)
            if (diffR > 40 || diffD > 40) edgeScore++;
          }
        }
      }

      // Calculate color variance
      const avgR = reds.reduce((a, b) => a + b, 0) / pixelCount;
      const avgG = greens.reduce((a, b) => a + b, 0) / pixelCount;
      const avgB = blues.reduce((a, b) => a + b, 0) / pixelCount;

      const varR = reds.reduce((a, b) => a + (b - avgR) ** 2, 0) / pixelCount;
      const varG = greens.reduce((a, b) => a + (b - avgG) ** 2, 0) / pixelCount;
      const varB = blues.reduce((a, b) => a + (b - avgB) ** 2, 0) / pixelCount;

      colorVariance = (varR + varG + varB) / 3;

      // Normalize scores
      const normalizedNoise = Math.min(noiseScore / (pixelCount * 20), 1);
      const normalizedEdge = edgeScore / (pixelCount || 1);

      // AI confidence: low noise + low variance + few edges = more likely AI
      // Natural images tend to have more varied noise and edges
      let confidence = 0;

      // Low noise regions are suspicious (AI tends to be "too clean")
      if (normalizedNoise < 0.3) confidence += 0.3;
      else if (normalizedNoise < 0.5) confidence += 0.15;

      // Very uniform color in blocks is suspicious
      if (colorVariance < 100) confidence += 0.25;
      else if (colorVariance < 300) confidence += 0.1;

      // Lack of natural edges
      if (normalizedEdge < 0.02) confidence += 0.2;
      else if (normalizedEdge < 0.05) confidence += 0.1;

      // But sharp, unnatural edges are also suspicious
      if (normalizedEdge > 0.3) confidence += 0.15;

      // Very smooth gradient regions (AI hallmark)
      const maxColorDiff = Math.max(
        Math.abs(avgR - avgG),
        Math.abs(avgG - avgB),
        Math.abs(avgR - avgB)
      );
      if (maxColorDiff < 10 && colorVariance < 50) confidence += 0.1;

      row.push(Math.min(confidence, 1.0));
    }
    grid.push(row);
  }

  return {
    grid,
    blockSize,
    gridWidth: gridW,
    gridHeight: gridH,
    width,
    height
  };
}

export function getConfidenceMapStats(confidenceMap) {
  const { grid } = confidenceMap;
  if (!grid.length) return { average: 0, max: 0, min: 0, hotspots: 0 };

  const allValues = grid.flat();
  const average = allValues.reduce((a, b) => a + b, 0) / allValues.length;
  const max = Math.max(...allValues);
  const min = Math.min(...allValues);
  const hotspots = allValues.filter(v => v > 0.7).length;

  return {
    average: average * 100,
    max: max * 100,
    min: min * 100,
    hotspots,
    totalBlocks: allValues.length
  };
}
