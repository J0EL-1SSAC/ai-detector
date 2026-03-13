/**
 * Error Level Analysis (ELA) Engine
 * Re-compresses the image at a known quality and compares differences.
 * Modified/AI-generated regions show higher error levels.
 */

export function performELA(imageData, width, height, quality = 85) {
  const findings = [];
  let score = 0;

  // Create canvas and re-compress
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Put original image data
  const imgDataObj = new ImageData(new Uint8ClampedArray(imageData), width, height);
  ctx.putImageData(imgDataObj, 0, 0);

  // Re-compress as JPEG
  const recompressedUrl = canvas.toDataURL('image/jpeg', quality / 100);

  // Load recompressed image and compute differences
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      const recompressedData = ctx.getImageData(0, 0, width, height).data;

      // Compute Error Level for each pixel
      const elaData = new Uint8ClampedArray(width * height * 4);
      const blockSize = 16;
      const blockErrors = [];
      let totalError = 0;
      let maxError = 0;

      for (let i = 0; i < imageData.length; i += 4) {
        const errR = Math.abs(imageData[i] - recompressedData[i]) * 10;
        const errG = Math.abs(imageData[i + 1] - recompressedData[i + 1]) * 10;
        const errB = Math.abs(imageData[i + 2] - recompressedData[i + 2]) * 10;

        elaData[i] = Math.min(errR, 255);
        elaData[i + 1] = Math.min(errG, 255);
        elaData[i + 2] = Math.min(errB, 255);
        elaData[i + 3] = 255;

        const pixelError = (errR + errG + errB) / 3;
        totalError += pixelError;
        maxError = Math.max(maxError, pixelError);
      }

      const avgError = totalError / (width * height);

      // Block-level analysis
      const gridW = Math.ceil(width / blockSize);
      const gridH = Math.ceil(height / blockSize);

      for (let by = 0; by < gridH; by++) {
        for (let bx = 0; bx < gridW; bx++) {
          let blockErr = 0;
          let count = 0;
          for (let y = by * blockSize; y < Math.min((by + 1) * blockSize, height); y++) {
            for (let x = bx * blockSize; x < Math.min((bx + 1) * blockSize, width); x++) {
              const idx = (y * width + x) * 4;
              blockErr += (elaData[idx] + elaData[idx + 1] + elaData[idx + 2]) / 3;
              count++;
            }
          }
          blockErrors.push(blockErr / count);
        }
      }

      // Calculate variance in block errors
      const avgBlockError = blockErrors.reduce((a, b) => a + b, 0) / blockErrors.length;
      const blockVariance = blockErrors.reduce((a, b) => a + (b - avgBlockError) ** 2, 0) / blockErrors.length;
      const highErrorBlocks = blockErrors.filter(e => e > avgBlockError * 2).length;

      // Scoring
      if (avgError < 5) {
        score += 20;
        findings.push({
          severity: 'high',
          title: 'Uniformly Low Error Levels',
          detail: `Average ELA error: ${avgError.toFixed(2)}. AI-generated images show unnaturally uniform low error levels because they haven't been through real JPEG compression cycles.`
        });
      } else if (avgError > 30) {
        score += 5;
        findings.push({
          severity: 'low',
          title: 'High Error Levels',
          detail: `Average ELA error: ${avgError.toFixed(2)}. High error levels can indicate heavy editing or format conversion.`
        });
      }

      if (blockVariance < 50) {
        score += 15;
        findings.push({
          severity: 'medium',
          title: 'Uniform Error Distribution',
          detail: `Block variance: ${blockVariance.toFixed(2)}. AI-generated images have unnaturally uniform ELA distributions, unlike edited photos which show varying levels.`
        });
      }

      if (highErrorBlocks > blockErrors.length * 0.3) {
        score += 10;
        findings.push({
          severity: 'medium',
          title: 'Inconsistent Compression Regions',
          detail: `${highErrorBlocks} of ${blockErrors.length} blocks show elevated error levels. This indicates regions were processed differently — possible AI generation or heavy editing.`
        });
      }

      if (maxError < 20) {
        score += 10;
        findings.push({
          severity: 'medium',
          title: 'No Natural Compression Artifacts',
          detail: `Maximum error: ${maxError.toFixed(2)}. Real photographs show hot spots at edges and textures. Absence suggests synthetic origin.`
        });
      }

      resolve({
        name: 'Error Level Analysis',
        score: Math.min(score, 100),
        findings: findings.length > 0 ? findings : [{
          severity: 'info',
          title: 'ELA Results Normal',
          detail: 'Error level analysis shows patterns consistent with normally processed images.'
        }],
        elaData,
        avgError,
        maxError,
        blockVariance,
        icon: 'FlaskConical'
      });
    };
    img.onerror = () => {
      resolve({
        name: 'Error Level Analysis',
        score: 0,
        findings: [{ severity: 'info', title: 'ELA Unavailable', detail: 'Could not perform ELA on this image format.' }],
        icon: 'FlaskConical'
      });
    };
    img.src = recompressedUrl;
  });
}
