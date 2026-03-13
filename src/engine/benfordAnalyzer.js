/**
 * Benford's Law Analysis
 * In natural images, the first digits of pixel intensity values follow Benford's Law.
 * AI-generated images often violate this distribution.
 */

// Expected Benford's Law distribution for first digits 1-9
const BENFORD_EXPECTED = [
  0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046
];

function getFirstDigit(n) {
  if (n === 0) return 0;
  n = Math.abs(n);
  while (n >= 10) n = Math.floor(n / 10);
  return n;
}

function chiSquareTest(observed, expected, sampleSize) {
  let chiSq = 0;
  for (let i = 0; i < expected.length; i++) {
    const expectedCount = expected[i] * sampleSize;
    if (expectedCount > 0) {
      chiSq += ((observed[i] - expectedCount) ** 2) / expectedCount;
    }
  }
  return chiSq;
}

export function analyzeBenfordsLaw(imageData, width, height) {
  const findings = [];
  let score = 0;

  // Count first digits of luminance values (excluding 0)
  const digitCounts = new Array(10).fill(0);
  let totalPixels = 0;

  for (let i = 0; i < imageData.length; i += 4) {
    // Luminance
    const lum = Math.round(0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2]);
    if (lum > 0) {
      const fd = getFirstDigit(lum);
      if (fd >= 1 && fd <= 9) {
        digitCounts[fd]++;
        totalPixels++;
      }
    }

    // Also check individual channels for DCT coefficient-like values
    for (let c = 0; c < 3; c++) {
      const val = imageData[i + c];
      if (val > 0 && val < 255) {
        const fd = getFirstDigit(val);
        if (fd >= 1 && fd <= 9) {
          digitCounts[fd]++;
          totalPixels++;
        }
      }
    }
  }

  // Calculate observed distribution
  const observed = [];
  const observedFreq = [];
  for (let d = 1; d <= 9; d++) {
    observed.push(digitCounts[d]);
    observedFreq.push(totalPixels > 0 ? digitCounts[d] / totalPixels : 0);
  }

  // Chi-square test
  const chiSquare = chiSquareTest(observed, BENFORD_EXPECTED, totalPixels);

  // Max Absolute Deviation (MAD)
  let mad = 0;
  const deviations = [];
  for (let i = 0; i < 9; i++) {
    const dev = Math.abs(observedFreq[i] - BENFORD_EXPECTED[i]);
    deviations.push(dev);
    mad = Math.max(mad, dev);
  }
  const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;

  // Scoring based on deviation from Benford's Law
  // Critical threshold: chi-square > 20.09 (p < 0.01 for df=8)
  if (chiSquare > 30) {
    score += 25;
    findings.push({
      severity: 'high',
      title: "Significant Benford's Law Violation",
      detail: `Chi-square: ${chiSquare.toFixed(2)} (critical threshold: 20.09 at p<0.01). The pixel value distribution significantly deviates from Benford's Law, suggesting synthetic generation.`
    });
  } else if (chiSquare > 20) {
    score += 15;
    findings.push({
      severity: 'medium',
      title: "Moderate Benford's Law Deviation",
      detail: `Chi-square: ${chiSquare.toFixed(2)}. Some deviation from the expected natural distribution. May indicate processing or AI generation.`
    });
  } else {
    findings.push({
      severity: 'low',
      title: "Benford's Law Compliance",
      detail: `Chi-square: ${chiSquare.toFixed(2)}. Pixel distribution follows Benford's Law within normal limits.`
    });
  }

  if (mad > 0.05) {
    score += 10;
    findings.push({
      severity: 'medium',
      title: 'High Maximum Deviation',
      detail: `Maximum absolute deviation: ${(mad * 100).toFixed(2)}%. A deviation > 5% from expected Benford distribution is notable.`
    });
  }

  // Check for suspiciously flat distribution (AI models sometimes produce uniform-ish distributions)
  const flatnessScore = deviations.filter(d => d < 0.01).length;
  if (flatnessScore >= 7) {
    score += 10;
    findings.push({
      severity: 'medium',
      title: 'Suspiciously Flat Distribution',
      detail: `${flatnessScore} of 9 digits have < 1% deviation. While seemingly good, this level of "perfection" is itself suspicious — natural images have more variation.`
    });
  }

  return {
    name: "Benford's Law Analysis",
    score: Math.min(score, 100),
    findings,
    distribution: {
      observed: observedFreq,
      expected: BENFORD_EXPECTED,
      chiSquare,
      mad,
      labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    },
    icon: 'BarChart3'
  };
}
