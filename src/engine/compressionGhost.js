/**
 * Compression Ghost Detection
 * Detects traces of repeated JPEG compression at different quality levels.
 * AI-generated images re-saved multiple times leave "ghost" artifacts.
 */

export function detectCompressionGhosts(imageData, width, height) {
  const findings = [];
  let score = 0;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgDataObj = new ImageData(new Uint8ClampedArray(imageData), width, height);
  ctx.putImageData(imgDataObj, 0, 0);

  const qualities = [95, 90, 85, 80, 75, 70, 60, 50];
  const ghostResults = [];

  return new Promise((resolve) => {
    let completed = 0;

    qualities.forEach((quality) => {
      const url = canvas.toDataURL('image/jpeg', quality / 100);
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(img, 0, 0, width, height);
        const reData = tempCtx.getImageData(0, 0, width, height).data;

        // Calculate difference
        let totalDiff = 0;
        let minDiff = Infinity;
        let maxDiff = 0;

        for (let i = 0; i < imageData.length; i += 4) {
          const diff = (
            Math.abs(imageData[i] - reData[i]) +
            Math.abs(imageData[i + 1] - reData[i + 1]) +
            Math.abs(imageData[i + 2] - reData[i + 2])
          ) / 3;
          totalDiff += diff;
        }

        const avgDiff = totalDiff / (width * height);
        ghostResults.push({ quality, avgDiff });

        completed++;
        if (completed === qualities.length) {
          analyzeGhosts();
        }
      };
      img.onerror = () => {
        completed++;
        if (completed === qualities.length) analyzeGhosts();
      };
      img.src = url;
    });

    function analyzeGhosts() {
      ghostResults.sort((a, b) => a.quality - b.quality);

      // Find minimum difference - this reveals the original compression quality
      let minGhost = { quality: 0, avgDiff: Infinity };
      for (const g of ghostResults) {
        if (g.avgDiff < minGhost.avgDiff) {
          minGhost = g;
        }
      }

      // Check for double compression signatures
      const diffs = ghostResults.map(g => g.avgDiff);
      const avgDiffAll = diffs.reduce((a, b) => a + b, 0) / diffs.length;

      // Look for valleys in the ghost curve (double compression markers)
      let valleys = 0;
      for (let i = 1; i < ghostResults.length - 1; i++) {
        if (ghostResults[i].avgDiff < ghostResults[i - 1].avgDiff &&
            ghostResults[i].avgDiff < ghostResults[i + 1].avgDiff) {
          valleys++;
        }
      }

      if (minGhost.avgDiff < 2) {
        score += 10;
        findings.push({
          severity: 'medium',
          title: `Compression Match at Q${minGhost.quality}`,
          detail: `Minimum ghost difference (${minGhost.avgDiff.toFixed(3)}) at quality ${minGhost.quality}. The image appears to have been previously saved at this quality level.`
        });
      }

      if (valleys >= 2) {
        score += 20;
        findings.push({
          severity: 'high',
          title: 'Double Compression Detected',
          detail: `Found ${valleys} compression ghost valleys. Multiple valleys indicate the image has been re-compressed several times — common when AI output is post-processed and re-saved.`
        });
      }

      // Very uniform ghost profile = likely PNG/lossless origin (AI generators often output PNG)
      const ghostVariance = ghostResults.reduce((a, g) => a + (g.avgDiff - avgDiffAll) ** 2, 0) / ghostResults.length;
      if (ghostVariance < 1 && avgDiffAll < 5) {
        score += 15;
        findings.push({
          severity: 'medium',
          title: 'No Prior JPEG Compression',
          detail: `Uniform ghost profile (variance: ${ghostVariance.toFixed(3)}) suggests the image was never JPEG-compressed before. AI generators typically output in lossless PNG format.`
        });
      }

      if (findings.length === 0) {
        findings.push({
          severity: 'info',
          title: 'Normal Compression Profile',
          detail: 'Compression ghost analysis shows patterns consistent with standard image processing.'
        });
      }

      resolve({
        name: 'Compression Ghost',
        score: Math.min(score, 100),
        findings,
        ghostResults,
        icon: 'Eye'
      });
    }
  });
}
