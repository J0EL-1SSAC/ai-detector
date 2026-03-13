/**
 * PRNU (Photo Response Non-Uniformity) Sensor Analysis
 * Real cameras have unique sensor noise patterns (like fingerprints).
 * AI-generated images lack this natural PRNU noise.
 */

export function analyzePRNU(imageData, width, height) {
  const findings = [];
  let score = 0;

  // Extract noise residual using a denoising filter (simplified Wiener-like approach)
  const noiseResidual = new Float32Array(width * height);

  // Simple averaging filter for denoising
  const kernelSize = 3;
  const half = Math.floor(kernelSize / 2);

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let sum = 0;
      let count = 0;

      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const lum = 0.299 * imageData[idx] + 0.587 * imageData[idx + 1] + 0.114 * imageData[idx + 2];
          sum += lum;
          count++;
        }
      }

      const idx = (y * width + x) * 4;
      const originalLum = 0.299 * imageData[idx] + 0.587 * imageData[idx + 1] + 0.114 * imageData[idx + 2];
      noiseResidual[y * width + x] = originalLum - (sum / count);
    }
  }

  // Analyze noise residual statistics
  let noiseSum = 0;
  let noiseSqSum = 0;
  let noiseCount = 0;
  const noiseValues = [];

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      const noise = noiseResidual[y * width + x];
      noiseSum += noise;
      noiseSqSum += noise * noise;
      noiseCount++;
      if (noiseValues.length < 50000) noiseValues.push(noise);
    }
  }

  const noiseMean = noiseSum / noiseCount;
  const noiseVariance = (noiseSqSum / noiseCount) - (noiseMean * noiseMean);
  const noiseStdDev = Math.sqrt(Math.max(0, noiseVariance));

  // Check for spatial correlation in noise (PRNU has spatial patterns)
  let correlationSum = 0;
  let correlationCount = 0;
  const blockSize = 32;

  for (let by = 0; by < Math.min(Math.floor(height / blockSize), 10); by++) {
    for (let bx = 0; bx < Math.min(Math.floor(width / blockSize), 10); bx++) {
      let blockNoise = 0;
      let bc = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize && y < height; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize && x < width; x++) {
          blockNoise += Math.abs(noiseResidual[y * width + x]);
          bc++;
        }
      }
      correlationSum += blockNoise / bc;
      correlationCount++;
    }
  }

  const avgBlockNoise = correlationSum / (correlationCount || 1);

  // Kurtosis check - Gaussian noise (AI) vs structured noise (camera)
  let kurtosisSum = 0;
  for (const n of noiseValues) {
    kurtosisSum += ((n - noiseMean) / (noiseStdDev || 1)) ** 4;
  }
  const kurtosis = (kurtosisSum / noiseValues.length) - 3; // Excess kurtosis

  // Scoring
  if (noiseStdDev < 1.5) {
    score += 25;
    findings.push({
      severity: 'high',
      title: 'Abnormally Low Sensor Noise',
      detail: `Noise std dev: ${noiseStdDev.toFixed(3)}. Real camera sensors produce measurable PRNU noise (typically 2-8). Very low noise indicates synthetic generation.`
    });
  } else if (noiseStdDev < 3) {
    score += 10;
    findings.push({
      severity: 'medium',
      title: 'Low Sensor Noise',
      detail: `Noise std dev: ${noiseStdDev.toFixed(3)}. Slightly below typical camera noise levels. May be heavily denoised or AI-generated.`
    });
  } else {
    findings.push({
      severity: 'low',
      title: 'Normal Sensor Noise Level',
      detail: `Noise std dev: ${noiseStdDev.toFixed(3)}. Within range expected from real camera sensors.`
    });
  }

  if (Math.abs(kurtosis) < 0.5) {
    score += 15;
    findings.push({
      severity: 'medium',
      title: 'Gaussian-Like Noise Distribution',
      detail: `Excess kurtosis: ${kurtosis.toFixed(3)}. AI-generated images produce near-perfectly Gaussian noise. Real cameras have non-Gaussian structured noise (kurtosis typically > 1).`
    });
  } else if (kurtosis > 2) {
    findings.push({
      severity: 'low',
      title: 'Structured Noise Pattern',
      detail: `Excess kurtosis: ${kurtosis.toFixed(3)}. Heavy-tailed distribution consistent with real camera sensor noise.`
    });
  }

  // Check noise spatial uniformity
  const blockNoises = [];
  for (let by = 0; by < Math.min(Math.floor(height / blockSize), 10); by++) {
    for (let bx = 0; bx < Math.min(Math.floor(width / blockSize), 10); bx++) {
      let bn = 0, bc = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize && y < height; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize && x < width; x++) {
          bn += Math.abs(noiseResidual[y * width + x]);
          bc++;
        }
      }
      blockNoises.push(bn / bc);
    }
  }

  const blockMean = blockNoises.reduce((a, b) => a + b, 0) / blockNoises.length;
  const blockVariance = blockNoises.reduce((a, b) => a + (b - blockMean) ** 2, 0) / blockNoises.length;

  if (blockVariance < 0.5) {
    score += 15;
    findings.push({
      severity: 'high',
      title: 'Spatially Uniform Noise',
      detail: `Block noise variance: ${blockVariance.toFixed(4)}. Real PRNU noise varies spatially across the sensor. Uniform noise suggests AI synthesis.`
    });
  }

  return {
    name: 'PRNU Sensor Analysis',
    score: Math.min(score, 100),
    findings,
    noiseStdDev,
    kurtosis,
    icon: 'Radio'
  };
}
