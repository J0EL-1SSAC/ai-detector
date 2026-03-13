/**
 * GAN Fingerprint Decoder
 * Analyzes frequency domain signatures to identify specific GAN architectures
 */

export function decodeGANFingerprint(imageData, width, height) {
  const findings = [];
  let score = 0;
  const fingerprints = {};

  // 1. Spectral Analysis - compute power spectrum via DCT-like estimation
  const luminance = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    luminance[i] = 0.299 * imageData[idx] + 0.587 * imageData[idx + 1] + 0.114 * imageData[idx + 2];
  }

  // Compute row-wise differences (horizontal frequency content)
  const horzFreqs = new Float32Array(256).fill(0);
  const vertFreqs = new Float32Array(256).fill(0);

  for (let y = 0; y < Math.min(height, 512); y++) {
    for (let x = 0; x < Math.min(width - 1, 512); x++) {
      const diff = Math.abs(luminance[y * width + x] - luminance[y * width + x + 1]);
      const bin = Math.min(Math.floor(diff), 255);
      horzFreqs[bin]++;
    }
  }

  for (let x = 0; x < Math.min(width, 512); x++) {
    for (let y = 0; y < Math.min(height - 1, 512); y++) {
      const diff = Math.abs(luminance[y * width + x] - luminance[(y + 1) * width + x]);
      const bin = Math.min(Math.floor(diff), 255);
      vertFreqs[bin]++;
    }
  }

  // 2. Check for periodic spectral peaks (GAN fingerprint)
  let peakCount = 0;
  let totalEnergy = 0;
  let highFreqEnergy = 0;

  for (let i = 0; i < 256; i++) {
    totalEnergy += horzFreqs[i] + vertFreqs[i];
    if (i > 128) highFreqEnergy += horzFreqs[i] + vertFreqs[i];

    if (i > 2 && i < 253) {
      const avgNeighbor = (horzFreqs[i - 1] + horzFreqs[i + 1] + horzFreqs[i - 2] + horzFreqs[i + 2]) / 4;
      if (horzFreqs[i] > avgNeighbor * 2 && horzFreqs[i] > 100) peakCount++;
    }
  }

  const highFreqRatio = totalEnergy > 0 ? highFreqEnergy / totalEnergy : 0;

  // 3. Check specific GAN signatures
  // StyleGAN: characteristic spectral peaks at specific frequencies
  let styleganScore = 0;
  if (peakCount >= 3) styleganScore += 30;
  if (highFreqRatio < 0.05) styleganScore += 20;

  // Diffusion Models: smoother spectra, less high-frequency content
  let diffusionScore = 0;
  if (highFreqRatio < 0.03) diffusionScore += 25;
  if (peakCount <= 1) diffusionScore += 15;

  // Check for upsampling artifacts (stride artifacts in transposed convolution)
  let strideArtifacts = 0;
  for (let period = 2; period <= 8; period++) {
    let matches = 0;
    let total = 0;
    for (let i = period; i < 128; i += period) {
      if (i + 1 < 256 && Math.abs(horzFreqs[i] - horzFreqs[i + 1]) > horzFreqs[i] * 0.3) {
        matches++;
      }
      total++;
    }
    if (total > 0 && matches / total > 0.5) strideArtifacts++;
  }

  if (strideArtifacts >= 2) {
    styleganScore += 15;
    score += 15;
    findings.push({
      severity: 'high',
      title: 'Transposed Convolution Artifacts',
      detail: `Detected ${strideArtifacts} periodic stride patterns. These "checkerboard" frequency artifacts are hallmarks of upsampling layers in GAN generators.`
    });
  }

  // 4. Color channel correlation analysis
  let rg_corr = 0, gb_corr = 0, rb_corr = 0;
  const sampleSize = Math.min(width * height, 100000);
  const step = Math.floor(width * height / sampleSize);

  for (let i = 0; i < width * height; i += step) {
    const idx = i * 4;
    rg_corr += Math.abs(imageData[idx] - imageData[idx + 1]);
    gb_corr += Math.abs(imageData[idx + 1] - imageData[idx + 2]);
    rb_corr += Math.abs(imageData[idx] - imageData[idx + 2]);
  }

  const samples = Math.ceil(width * height / step);
  rg_corr /= samples;
  gb_corr /= samples;
  rb_corr /= samples;

  // AI images often have very correlated color channels
  if (rg_corr < 15 && gb_corr < 15 && rb_corr < 15) {
    score += 10;
    diffusionScore += 10;
    findings.push({
      severity: 'medium',
      title: 'High Color Channel Correlation',
      detail: `Channel differences — R-G: ${rg_corr.toFixed(1)}, G-B: ${gb_corr.toFixed(1)}, R-B: ${rb_corr.toFixed(1)}. AI models often produce unnaturally correlated color channels.`
    });
  }

  // 5. Determine most likely GAN architecture
  const architectures = {
    'StyleGAN / ProGAN': styleganScore,
    'Stable Diffusion / SDXL': diffusionScore,
    'DALL-E (Diffusion)': diffusionScore * 0.85,
    'Midjourney (Diffusion)': diffusionScore * 0.8,
    'GAN (Generic)': peakCount >= 2 ? 25 : 5,
    'VAE-based': highFreqRatio < 0.04 ? 20 : 5
  };

  const topArch = Object.entries(architectures).sort((a, b) => b[1] - a[1])[0];

  if (topArch[1] > 25) {
    score += 15;
    findings.push({
      severity: 'high',
      title: `Architecture Match: ${topArch[0]}`,
      detail: `Spectral fingerprint has ${topArch[1].toFixed(0)}% similarity to ${topArch[0]} output characteristics.`
    });
  }

  fingerprints.architectures = architectures;
  fingerprints.peakCount = peakCount;
  fingerprints.highFreqRatio = highFreqRatio;

  if (findings.length === 0) {
    findings.push({
      severity: 'info',
      title: 'No Clear GAN Fingerprint',
      detail: 'Spectral analysis did not reveal characteristic GAN artifacts. The image may be authentic or from a very advanced generator.'
    });
  }

  return {
    name: 'GAN Fingerprint',
    score: Math.min(score, 100),
    findings,
    fingerprints,
    icon: 'Fingerprint'
  };
}
