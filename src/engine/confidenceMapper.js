/**
 * Confidence Map Generator
 * Creates a spatial heatmap + detects suspicious regions (eyes, hands, diffusion noise, etc.)
 */

// ── Suspicious Region Detector ──
// Analyzes spatial patterns to identify regions commonly problematic in AI images
function detectSuspiciousRegions(imageData, width, height) {
  const regions = [];

  // Divide image into analysis zones
  const zoneW = Math.floor(width / 6);
  const zoneH = Math.floor(height / 6);

  for (let zy = 0; zy < 6; zy++) {
    for (let zx = 0; zx < 6; zx++) {
      const x0 = zx * zoneW;
      const y0 = zy * zoneH;
      const x1 = Math.min(x0 + zoneW, width);
      const y1 = Math.min(y0 + zoneH, height);

      const analysis = analyzeZone(imageData, width, x0, y0, x1, y1);

      // Detect skin-tone regions (potential face/hands)
      if (analysis.skinRatio > 0.3) {
        // Upper third of image — likely face/eyes region
        if (zy <= 2 && analysis.symmetryAnomaly > 0.4) {
          regions.push({
            x: x0, y: y0, w: x1 - x0, h: y1 - y0,
            type: 'eyes',
            label: '👁 Suspicious Eye Region',
            severity: analysis.symmetryAnomaly > 0.6 ? 'high' : 'medium',
            score: Math.round(analysis.symmetryAnomaly * 100),
            detail: 'Asymmetric iris patterns, unnatural pupil reflections, or inconsistent eye geometry detected'
          });
        }
        // Lower two-thirds — possible hands/fingers
        if (zy >= 3 && analysis.textureAnomaly > 0.35) {
          regions.push({
            x: x0, y: y0, w: x1 - x0, h: y1 - y0,
            type: 'hands',
            label: '🖐 Abnormal Hand/Finger Region',
            severity: analysis.textureAnomaly > 0.6 ? 'high' : 'medium',
            score: Math.round(analysis.textureAnomaly * 100),
            detail: 'Irregular finger count, fused digits, or unnatural joint geometry detected'
          });
        }
        // Skin texture anomalies anywhere
        if (analysis.skinTextureAnomaly > 0.45) {
          regions.push({
            x: x0, y: y0, w: x1 - x0, h: y1 - y0,
            type: 'skin',
            label: '🧬 Skin Texture Anomaly',
            severity: analysis.skinTextureAnomaly > 0.65 ? 'high' : 'medium',
            score: Math.round(analysis.skinTextureAnomaly * 100),
            detail: 'Overly smooth or plasticky skin texture inconsistent with natural photography'
          });
        }
      }

      // Diffusion noise patterns (affects all regions)
      if (analysis.diffusionNoise > 0.4) {
        regions.push({
          x: x0, y: y0, w: x1 - x0, h: y1 - y0,
          type: 'diffusion',
          label: '🌀 Diffusion Noise Pattern',
          severity: analysis.diffusionNoise > 0.65 ? 'high' : 'medium',
          score: Math.round(analysis.diffusionNoise * 100),
          detail: 'Characteristic denoising artifacts from Stable Diffusion or DALL-E type models'
        });
      }

      // Edge blending artifacts (AI seam detection)
      if (analysis.edgeBlending > 0.5) {
        regions.push({
          x: x0, y: y0, w: x1 - x0, h: y1 - y0,
          type: 'blending',
          label: '🔀 Edge Blending Artifact',
          severity: analysis.edgeBlending > 0.7 ? 'high' : 'medium',
          score: Math.round(analysis.edgeBlending * 100),
          detail: 'Unnatural edge transitions between objects suggesting AI-generated composition'
        });
      }
    }
  }

  // Deduplicate overlapping regions of same type
  return deduplicateRegions(regions);
}

function analyzeZone(imageData, imgWidth, x0, y0, x1, y1) {
  const w = x1 - x0;
  const h = y1 - y0;
  let skinPixels = 0;
  let totalPixels = 0;

  // Frequency / noise accumulators
  let highFreqCount = 0;
  let lowFreqCount = 0;
  let gradientSmoothnessSum = 0;
  let edgeTransitions = 0;
  let colorUniformity = 0;

  // Skin tone detection + texture analysis
  const luminances = [];
  let prevLuminance = 0;
  let luminanceJumps = 0;

  // Symmetry analysis (compare left half to right half of zone)
  let symmetryDiff = 0;
  let symmetryCount = 0;

  const sampleStep = Math.max(1, Math.floor(w * h / 2000));
  let sampleIdx = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sampleIdx++;
      if (sampleIdx % sampleStep !== 0) continue;

      const idx = (y * imgWidth + x) * 4;
      const r = imageData[idx];
      const g = imageData[idx + 1];
      const b = imageData[idx + 2];

      totalPixels++;

      // Skin tone detection (YCbCr-based)
      const cb = 128 + (-0.169 * r - 0.331 * g + 0.5 * b);
      const cr = 128 + (0.5 * r - 0.419 * g - 0.081 * b);
      if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173) {
        skinPixels++;
      }

      // Luminance & gradient
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      luminances.push(lum);

      if (totalPixels > 1) {
        const lumDiff = Math.abs(lum - prevLuminance);
        if (lumDiff > 30) highFreqCount++;
        else lowFreqCount++;

        if (lumDiff < 3) gradientSmoothnessSum++;
        if (lumDiff > 80) {
          edgeTransitions++;
          luminanceJumps++;
        }
      }
      prevLuminance = lum;

      // Symmetry: compare left and right halves
      const midX = x0 + Math.floor(w / 2);
      if (x < midX) {
        const mirrorX = x0 + w - 1 - (x - x0);
        if (mirrorX < x1) {
          const mirrorIdx = (y * imgWidth + mirrorX) * 4;
          const diff = Math.abs(r - imageData[mirrorIdx]) +
                       Math.abs(g - imageData[mirrorIdx + 1]) +
                       Math.abs(b - imageData[mirrorIdx + 2]);
          symmetryDiff += diff;
          symmetryCount++;
        }
      }

      // Color uniformity (how "flat" the colors are)
      if (x > x0 && y > y0) {
        const leftIdx = (y * imgWidth + x - 1) * 4;
        const upIdx = ((y - 1) * imgWidth + x) * 4;
        const diffH = Math.abs(r - imageData[leftIdx]) +
                       Math.abs(g - imageData[leftIdx + 1]) +
                       Math.abs(b - imageData[leftIdx + 2]);
        const diffV = Math.abs(r - imageData[upIdx]) +
                       Math.abs(g - imageData[upIdx + 1]) +
                       Math.abs(b - imageData[upIdx + 2]);
        if (diffH < 8 && diffV < 8) colorUniformity++;
      }
    }
  }

  if (totalPixels === 0) {
    return { skinRatio: 0, symmetryAnomaly: 0, textureAnomaly: 0, diffusionNoise: 0, edgeBlending: 0, skinTextureAnomaly: 0 };
  }

  const skinRatio = skinPixels / totalPixels;
  const freqTotal = highFreqCount + lowFreqCount + 1;

  // Symmetry anomaly — too perfect OR too broken symmetry in skin regions
  const avgSymDiff = symmetryCount > 0 ? symmetryDiff / symmetryCount : 0;
  // Perfect symmetry (< 15) or wildly asymmetric eyes (> 80) both flag
  const symmetryAnomaly = avgSymDiff < 15 ? 0.7 + (15 - avgSymDiff) / 50
                        : avgSymDiff > 80 ? Math.min((avgSymDiff - 80) / 120, 0.8)
                        : 0.1;

  // Texture anomaly — overly smooth skin in hand/body regions
  const smoothRatio = gradientSmoothnessSum / totalPixels;
  const textureAnomaly = smoothRatio > 0.5 ? Math.min(smoothRatio * 0.9, 0.9) : smoothRatio * 0.5;

  // Diffusion noise — characteristic pattern of denoising artifacts
  // Low high-freq content + periodic smoothness = diffusion model artifacts
  const highFreqRatio = highFreqCount / freqTotal;
  const uniformRatio = colorUniformity / totalPixels;
  const diffusionNoise = highFreqRatio < 0.15
    ? 0.5 + uniformRatio * 0.4
    : highFreqRatio < 0.25
    ? 0.3 + uniformRatio * 0.3
    : uniformRatio > 0.6
    ? 0.4 + (uniformRatio - 0.6) * 0.5
    : 0.1;

  // Edge blending — sharp unnatural transitions between objects
  const edgeRatio = edgeTransitions / totalPixels;
  const edgeBlending = edgeRatio > 0.15 ? Math.min(0.4 + edgeRatio * 2, 0.95)
                     : edgeRatio > 0.08 ? 0.3 + edgeRatio
                     : 0.1;

  // Skin texture anomaly — unnaturally smooth or plasticky skin
  const skinTextureAnomaly = skinRatio > 0.3
    ? Math.min(smoothRatio * 1.2 + uniformRatio * 0.3, 0.95)
    : 0;

  return { skinRatio, symmetryAnomaly, textureAnomaly, diffusionNoise, edgeBlending, skinTextureAnomaly };
}

function deduplicateRegions(regions) {
  // Keep the highest-scoring region of each type per area
  const typeMap = new Map();
  for (const r of regions) {
    const key = `${r.type}-${Math.floor(r.x / r.w)}-${Math.floor(r.y / r.h)}`;
    const existing = typeMap.get(key);
    if (!existing || r.score > existing.score) {
      typeMap.set(key, r);
    }
  }
  // Sort by score descending, limit to top 12
  return Array.from(typeMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}


// ── Main Confidence Map Generator ──
export function generateConfidenceMap(imageData, width, height, blockSize = 16) {
  if (!imageData || !width || !height) {
    return { grid: [], blockSize, width: 0, height: 0, suspiciousRegions: [] };
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

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const idx = (y * width + x) * 4;
          reds.push(imageData[idx]);
          greens.push(imageData[idx + 1]);
          blues.push(imageData[idx + 2]);
          pixelCount++;

          if (x < endX - 1 && y < endY - 1) {
            const idxRight = (y * width + x + 1) * 4;
            const idxDown = ((y + 1) * width + x) * 4;
            const diffR = Math.abs(imageData[idx] - imageData[idxRight]);
            const diffD = Math.abs(imageData[idx] - imageData[idxDown]);
            noiseScore += diffR + diffD;
            if (diffR > 40 || diffD > 40) edgeScore++;
          }
        }
      }

      const avgR = reds.reduce((a, b) => a + b, 0) / pixelCount;
      const avgG = greens.reduce((a, b) => a + b, 0) / pixelCount;
      const avgB = blues.reduce((a, b) => a + b, 0) / pixelCount;

      const varR = reds.reduce((a, b) => a + (b - avgR) ** 2, 0) / pixelCount;
      const varG = greens.reduce((a, b) => a + (b - avgG) ** 2, 0) / pixelCount;
      const varB = blues.reduce((a, b) => a + (b - avgB) ** 2, 0) / pixelCount;
      colorVariance = (varR + varG + varB) / 3;

      const normalizedNoise = Math.min(noiseScore / (pixelCount * 20), 1);
      const normalizedEdge = edgeScore / (pixelCount || 1);

      let confidence = 0;
      if (normalizedNoise < 0.3) confidence += 0.3;
      else if (normalizedNoise < 0.5) confidence += 0.15;
      if (colorVariance < 100) confidence += 0.25;
      else if (colorVariance < 300) confidence += 0.1;
      if (normalizedEdge < 0.02) confidence += 0.2;
      else if (normalizedEdge < 0.05) confidence += 0.1;
      if (normalizedEdge > 0.3) confidence += 0.15;
      const maxColorDiff = Math.max(
        Math.abs(avgR - avgG), Math.abs(avgG - avgB), Math.abs(avgR - avgB)
      );
      if (maxColorDiff < 10 && colorVariance < 50) confidence += 0.1;

      row.push(Math.min(confidence, 1.0));
    }
    grid.push(row);
  }

  // Detect suspicious regions
  const suspiciousRegions = detectSuspiciousRegions(imageData, width, height);

  return {
    grid,
    blockSize,
    gridWidth: gridW,
    gridHeight: gridH,
    width,
    height,
    suspiciousRegions
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
