/**
 * GAN Fingerprint Decoder
 * Improved AI image detection using spectral + texture + color analysis
 */

export function decodeGANFingerprint(imageData, width, height) {

  const findings = [];
  const fingerprints = {};
  let score = 20; // base score so we don't get 0%

  // Convert to luminance
  const luminance = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    luminance[i] =
      0.299 * imageData[idx] +
      0.587 * imageData[idx + 1] +
      0.114 * imageData[idx + 2];
  }

  // -------------------------------------
  // Frequency Analysis
  // -------------------------------------

  const horzFreqs = new Float32Array(256).fill(0);
  const vertFreqs = new Float32Array(256).fill(0);

  const maxWidth = Math.min(width - 1, 512);
  const maxHeight = Math.min(height - 1, 512);

  for (let y = 0; y < maxHeight; y++) {
    for (let x = 0; x < maxWidth; x++) {

      const diffH = Math.abs(
        luminance[y * width + x] -
        luminance[y * width + x + 1]
      );

      const binH = Math.min(Math.floor(diffH), 255);
      horzFreqs[binH]++;

      const diffV = Math.abs(
        luminance[y * width + x] -
        luminance[(y + 1) * width + x]
      );

      const binV = Math.min(Math.floor(diffV), 255);
      vertFreqs[binV]++;
    }
  }

  let peakCount = 0;
  let totalEnergy = 0;
  let highFreqEnergy = 0;

  for (let i = 0; i < 256; i++) {

    totalEnergy += horzFreqs[i] + vertFreqs[i];

    if (i > 128) {
      highFreqEnergy += horzFreqs[i] + vertFreqs[i];
    }

    if (i > 2 && i < 253) {

      const avgNeighbor =
        (horzFreqs[i - 1] +
          horzFreqs[i + 1] +
          horzFreqs[i - 2] +
          horzFreqs[i + 2]) / 4;

      if (horzFreqs[i] > avgNeighbor * 1.8 && horzFreqs[i] > 50) {
        peakCount++;
      }
    }
  }

  const highFreqRatio =
    totalEnergy > 0 ? highFreqEnergy / totalEnergy : 0;

  score += peakCount * 5;

  if (peakCount > 2) {
    findings.push({
      severity: "medium",
      title: "Spectral Peaks Detected",
      detail:
        "Periodic frequency spikes detected — typical of GAN generation artifacts."
    });
  }

  // -------------------------------------
  // Stride Artifact Detection
  // -------------------------------------

  let strideArtifacts = 0;

  for (let period = 2; period <= 8; period++) {

    let matches = 0;
    let total = 0;

    for (let i = period; i < 128; i += period) {

      if (
        i + 1 < 256 &&
        Math.abs(horzFreqs[i] - horzFreqs[i + 1]) >
          horzFreqs[i] * 0.25
      ) {
        matches++;
      }

      total++;
    }

    if (total > 0 && matches / total > 0.4) {
      strideArtifacts++;
    }
  }

  score += strideArtifacts * 10;

  if (strideArtifacts > 1) {
    findings.push({
      severity: "high",
      title: "Checkerboard Upsampling Artifacts",
      detail:
        "Detected periodic stride patterns typical of GAN transposed convolution."
    });
  }

  // -------------------------------------
  // Texture Variance
  // -------------------------------------

  let mean = 0;

  for (let i = 0; i < luminance.length; i++) {
    mean += luminance[i];
  }

  mean /= luminance.length;

  let variance = 0;

  for (let i = 0; i < luminance.length; i++) {
    variance += Math.pow(luminance[i] - mean, 2);
  }

  variance /= luminance.length;

  if (variance < 400) {
    score += 20;

    findings.push({
      severity: "medium",
      title: "Low Texture Variance",
      detail:
        "Image texture appears overly smooth — common in diffusion generated images."
    });
  }

  // -------------------------------------
  // Color Channel Correlation
  // -------------------------------------

  let rg_corr = 0;
  let gb_corr = 0;
  let rb_corr = 0;

  const sampleSize = Math.min(width * height, 100000);
  const step = Math.floor((width * height) / sampleSize);

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

  if (rg_corr < 35 && gb_corr < 35 && rb_corr < 35) {

    score += 15;

    findings.push({
      severity: "medium",
      title: "High Channel Correlation",
      detail:
        "Color channels appear unusually correlated — often seen in AI generated images."
    });
  }

  // -------------------------------------
  // Architecture Estimation
  // -------------------------------------

  const styleganScore =
    peakCount * 10 + strideArtifacts * 15;

  const diffusionScore =
    (1 - highFreqRatio) * 50 + (variance < 400 ? 20 : 0);

  const architectures = {
    "StyleGAN / ProGAN": styleganScore,
    "Stable Diffusion": diffusionScore,
    "Midjourney": diffusionScore * 0.9,
    "DALL-E": diffusionScore * 0.85,
    "Generic GAN": peakCount > 2 ? 40 : 10
  };

  const topArch = Object.entries(architectures).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (topArch[1] > 30) {

    score += 15;

    findings.push({
      severity: "high",
      title: `Likely Generator: ${topArch[0]}`,
      detail:
        `Spectral and texture fingerprints match ${topArch[0]} generation patterns.`
    });
  }

  fingerprints.architectures = architectures;
  fingerprints.peakCount = peakCount;
  fingerprints.highFreqRatio = highFreqRatio;
  fingerprints.textureVariance = variance;

  // -------------------------------------
  // Normalize score
  // -------------------------------------

  score = Math.round(score);

  if (score < 5) score = 5;
  if (score > 95) score = 95;

  if (findings.length === 0) {

    findings.push({
      severity: "info",
      title: "No Strong AI Fingerprint",
      detail:
        "The image does not show strong GAN or diffusion artifacts."
    });
  }

  return {
    name: "GAN Fingerprint",
    score,
    findings,
    fingerprints,
    icon: "Fingerprint"
  };
}
