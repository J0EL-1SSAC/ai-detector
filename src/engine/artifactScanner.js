/**
 * Model-Specific Artifact Scanner
 * Detects visual/audio artifacts commonly produced by AI generators
 */

function analyzeImageArtifacts(imageData, width, height) {
  const findings = [];
  let score = 0;

  // 1. Check for checkerboard / grid artifacts (common in GANs)
  const blockSize = 8;
  let checkerboardScore = 0;
  const blocksX = Math.floor(width / blockSize);
  const blocksY = Math.floor(height / blockSize);

  for (let by = 0; by < Math.min(blocksY - 1, 50); by++) {
    for (let bx = 0; bx < Math.min(blocksX - 1, 50); bx++) {
      const idx1 = ((by * blockSize) * width + bx * blockSize) * 4;
      const idx2 = ((by * blockSize) * width + (bx + 1) * blockSize) * 4;
      const idx3 = (((by + 1) * blockSize) * width + bx * blockSize) * 4;

      const diff1 = Math.abs(imageData[idx1] - imageData[idx2]) +
                     Math.abs(imageData[idx1 + 1] - imageData[idx2 + 1]) +
                     Math.abs(imageData[idx1 + 2] - imageData[idx2 + 2]);
      const diff2 = Math.abs(imageData[idx1] - imageData[idx3]) +
                     Math.abs(imageData[idx1 + 1] - imageData[idx3 + 1]) +
                     Math.abs(imageData[idx1 + 2] - imageData[idx3 + 2]);

      if (Math.abs(diff1 - diff2) < 3) checkerboardScore++;
    }
  }

  const maxCheckerboard = Math.min(blocksX - 1, 50) * Math.min(blocksY - 1, 50);
  const checkerboardRatio = maxCheckerboard > 0 ? checkerboardScore / maxCheckerboard : 0;

  if (checkerboardRatio > 0.7) {
    score += 20;
    findings.push({
      severity: 'high',
      title: 'Grid Pattern Artifacts',
      detail: `Detected repeating grid patterns (${(checkerboardRatio * 100).toFixed(1)}% coverage). GAN-based generators often produce subtle grid artifacts at block boundaries.`
    });
  } else if (checkerboardRatio > 0.5) {
    score += 10;
    findings.push({
      severity: 'medium',
      title: 'Possible Grid Artifacts',
      detail: `Some grid-like patterns detected (${(checkerboardRatio * 100).toFixed(1)}% coverage). May indicate AI-generated content.`
    });
  }

  // 2. Color distribution analysis (AI images tend to have smoother distributions)
  const colorHistogram = new Array(256).fill(0);
  for (let i = 0; i < imageData.length; i += 4) {
    const luminance = Math.round(0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2]);
    colorHistogram[luminance]++;
  }

  // Check for unusual gaps or spikes in histogram
  let emptyBins = 0;
  let maxBin = 0;
  for (let i = 10; i < 246; i++) {
    if (colorHistogram[i] === 0) emptyBins++;
    maxBin = Math.max(maxBin, colorHistogram[i]);
  }

  const totalPixels = width * height;
  const avgBin = totalPixels / 236;
  let spikeCount = 0;
  for (let i = 10; i < 246; i++) {
    if (colorHistogram[i] > avgBin * 4) spikeCount++;
  }

  if (emptyBins > 50) {
    score += 8;
    findings.push({
      severity: 'low',
      title: 'Gaps in Color Histogram',
      detail: `Found ${emptyBins} empty luminance bins. AI-generated images sometimes have non-natural color distributions.`
    });
  }

  if (spikeCount > 10) {
    score += 8;
    findings.push({
      severity: 'low',
      title: 'Color Distribution Spikes',
      detail: `Found ${spikeCount} unusual spikes in color histogram. May indicate synthetic generation.`
    });
  }

  // 3. Edge consistency analysis
  let edgeInconsistencies = 0;
  const sampleRows = Math.min(height, 100);
  const sampleCols = Math.min(width, 100);
  const rowStep = Math.floor(height / sampleRows);
  const colStep = Math.floor(width / sampleCols);

  for (let y = 1; y < sampleRows - 1; y++) {
    for (let x = 1; x < sampleCols - 1; x++) {
      const py = y * rowStep;
      const px = x * colStep;
      const idx = (py * width + px) * 4;
      const idxRight = (py * width + px + colStep) * 4;
      const idxDown = ((py + rowStep) * width + px) * 4;

      if (idx + 2 < imageData.length && idxRight + 2 < imageData.length && idxDown + 2 < imageData.length) {
        const gradX = Math.abs(imageData[idx] - imageData[idxRight]);
        const gradY = Math.abs(imageData[idx] - imageData[idxDown]);
        // Look for sudden gradient changes
        if (gradX > 100 && gradY < 10 || gradY > 100 && gradX < 10) {
          edgeInconsistencies++;
        }
      }
    }
  }

  const edgeRatio = edgeInconsistencies / (sampleRows * sampleCols);
  if (edgeRatio > 0.05) {
    score += 12;
    findings.push({
      severity: 'medium',
      title: 'Edge Inconsistencies',
      detail: `Found ${edgeInconsistencies} edge anomalies. AI models sometimes produce unnatural edge transitions, especially at object boundaries.`
    });
  }

  // 4. Frequency domain analysis (simplified DCT-like check)
  let highFreqEnergy = 0;
  let lowFreqEnergy = 0;
  const samples = Math.min(width * height, 10000);
  const sampleStep = Math.floor((width * height) / samples);

  for (let i = 0; i < samples; i++) {
    const idx = i * sampleStep * 4;
    if (idx + 7 < imageData.length) {
      const diff = Math.abs(imageData[idx] - imageData[idx + 4]) +
                   Math.abs(imageData[idx + 1] - imageData[idx + 5]) +
                   Math.abs(imageData[idx + 2] - imageData[idx + 6]);
      if (diff > 30) highFreqEnergy++;
      else lowFreqEnergy++;
    }
  }

  const freqRatio = highFreqEnergy / (highFreqEnergy + lowFreqEnergy + 1);
  if (freqRatio < 0.15) {
    score += 10;
    findings.push({
      severity: 'medium',
      title: 'Low High-Frequency Content',
      detail: `High-frequency ratio: ${(freqRatio * 100).toFixed(1)}%. AI-generated images often lack natural high-frequency details (sensor noise, fine textures).`
    });
  }

  // 5. Symmetry detection (AI tends to produce more symmetric content)
  let symmetryScore = 0;
  const symSamples = Math.min(height, 200);
  const symStep = Math.floor(height / symSamples);

  for (let y = 0; y < symSamples; y++) {
    const py = y * symStep;
    const leftIdx = (py * width + Math.floor(width * 0.25)) * 4;
    const rightIdx = (py * width + Math.floor(width * 0.75)) * 4;
    if (leftIdx + 2 < imageData.length && rightIdx + 2 < imageData.length) {
      const diff = Math.abs(imageData[leftIdx] - imageData[rightIdx]) +
                   Math.abs(imageData[leftIdx + 1] - imageData[rightIdx + 1]) +
                   Math.abs(imageData[leftIdx + 2] - imageData[rightIdx + 2]);
      if (diff < 30) symmetryScore++;
    }
  }

  const symmetryRatio = symmetryScore / symSamples;
  if (symmetryRatio > 0.6) {
    score += 8;
    findings.push({
      severity: 'low',
      title: 'High Bilateral Symmetry',
      detail: `Symmetry score: ${(symmetryRatio * 100).toFixed(1)}%. Unusually high symmetry can indicate AI-generated composition.`
    });
  }

  return { score: Math.min(score, 100), findings };
}

function analyzeAudioArtifacts(file) {
  const findings = [];
  let score = 0;

  // Check file size vs duration estimation
  const sizeKB = file.size / 1024;

  if (file.type.includes('wav')) {
    // WAV files have predictable sizes; AI often uses standard parameters
    if (sizeKB < 100) {
      score += 10;
      findings.push({
        severity: 'low',
        title: 'Small Audio File',
        detail: 'Very small audio file. AI-generated audio clips tend to be short demonstration pieces.'
      });
    }
  }

  if (file.type.includes('mp3') || file.type.includes('mpeg')) {
    // Check for typical AI bitrate patterns
    if (sizeKB > 0 && sizeKB < 50) {
      score += 8;
      findings.push({
        severity: 'low',
        title: 'Compact Audio',
        detail: 'Very compact audio file, which can be typical of AI-generated speech clips.'
      });
    }
  }

  findings.push({
    severity: 'info',
    title: 'Audio Analysis Note',
    detail: 'Full spectral analysis of audio requires specialized processing. The current analysis checks metadata signatures, file characteristics, and known AI tool markers.'
  });

  return { score, findings };
}

function analyzeVideoArtifacts(file) {
  const findings = [];
  let score = 0;

  const sizeMB = file.size / (1024 * 1024);

  // AI-generated videos are typically short and small
  if (sizeMB < 5) {
    score += 5;
    findings.push({
      severity: 'low',
      title: 'Small Video File',
      detail: `Video is ${sizeMB.toFixed(1)} MB. Current AI video generators typically produce short clips under 30 seconds.`
    });
  }

  // Check for common AI video formats
  if (file.type.includes('webm')) {
    score += 5;
    findings.push({
      severity: 'low',
      title: 'WebM Format',
      detail: 'WebM is commonly used by web-based AI generators for output.'
    });
  }

  findings.push({
    severity: 'info',
    title: 'Video Analysis Note',
    detail: 'Frame-by-frame analysis requires video decoding. Current analysis checks file characteristics and metadata markers.'
  });

  return { score, findings };
}

export async function scanArtifacts(file, imageData, width, height) {
  let result;

  if (file.type.startsWith('image/') && imageData) {
    result = analyzeImageArtifacts(imageData, width, height);
  } else if (file.type.startsWith('audio/')) {
    result = analyzeAudioArtifacts(file);
  } else if (file.type.startsWith('video/')) {
    result = analyzeVideoArtifacts(file);
  } else {
    result = {
      score: 0,
      findings: [{
        severity: 'info',
        title: 'Unsupported Format',
        detail: `File type "${file.type}" is not specifically supported for artifact scanning.`
      }]
    };
  }

  return {
    name: 'Model Artifact Scan',
    score: result.score,
    findings: result.findings,
    icon: 'Cpu'
  };
}
