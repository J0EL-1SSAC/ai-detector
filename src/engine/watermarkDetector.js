// Known AI watermark and content credential signatures
const WATERMARK_SIGNATURES = {
  c2pa: {
    name: 'C2PA Content Credentials',
    patterns: [
      'c2pa', 'contentcredentials', 'content credentials',
      'c2pa.assertions', 'c2pa.claim', 'c2pa.signature'
    ],
    weight: 35
  },
  adobeFirefly: {
    name: 'Adobe Firefly Watermark',
    patterns: ['firefly', 'adobe:GenAI', 'adobeFirefly', 'adobe_firefly'],
    weight: 40
  },
  googleSynthid: {
    name: 'Google SynthID',
    patterns: ['synthid', 'google:synthid', 'SynthID'],
    weight: 40
  },
  openai: {
    name: 'OpenAI Watermark',
    patterns: ['openai', 'dall-e', 'dalle', 'chatgpt'],
    weight: 40
  },
  stableDiffusion: {
    name: 'Stable Diffusion Marker',
    patterns: ['stablediffusion', 'stability.ai', 'CompVis', 'RunwayML'],
    weight: 35
  },
  midjourney: {
    name: 'Midjourney Marker',
    patterns: ['midjourney', 'mj_', 'discord.com/midjourney'],
    weight: 40
  },
  iptcAI: {
    name: 'IPTC AI Disclosure',
    patterns: ['digitalsourcetype', 'trainedAlgorithmic', 'compositeWithTrainedAlgorithmic'],
    weight: 30
  }
};

async function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve('');
    reader.readAsText(file);
  });
}

async function readFileAsArrayBuffer(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsArrayBuffer(file);
  });
}

function searchBinaryForPatterns(buffer, patterns) {
  const uint8 = new Uint8Array(buffer);
  const text = new TextDecoder('ascii', { fatal: false }).decode(uint8);
  const textLower = text.toLowerCase();
  return patterns.filter(p => textLower.includes(p.toLowerCase()));
}

function analyzePixelWatermarks(imageData, width, height) {
  const findings = [];
  let score = 0;

  // Check for periodic patterns in least significant bits (LSB)
  // AI watermarks often embed data in LSBs
  const lsbPattern = [];
  const sampleSize = Math.min(1000, width * height);
  const step = Math.floor((width * height) / sampleSize);

  for (let i = 0; i < width * height * 4; i += step * 4) {
    lsbPattern.push(imageData[i] & 1); // Red channel LSB
  }

  // Check for periodicity in LSB pattern
  let periodicCount = 0;
  for (let period = 8; period <= 64; period *= 2) {
    let matches = 0;
    for (let i = 0; i < lsbPattern.length - period; i++) {
      if (lsbPattern[i] === lsbPattern[i + period]) matches++;
    }
    const ratio = matches / (lsbPattern.length - period);
    if (ratio > 0.7) periodicCount++;
  }

  if (periodicCount >= 2) {
    score += 15;
    findings.push({
      severity: 'medium',
      title: 'Periodic LSB Pattern Detected',
      detail: 'Found periodic patterns in least significant bits, consistent with embedded digital watermarks.'
    });
  }

  // Check for uniform noise distribution (AI images often have more uniform noise)
  const noiseValues = [];
  for (let i = 0; i < Math.min(imageData.length, 40000); i += 4) {
    const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2];
    const noise = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
    noiseValues.push(noise);
  }

  const avgNoise = noiseValues.reduce((a, b) => a + b, 0) / noiseValues.length;
  const noiseVariance = noiseValues.reduce((a, b) => a + (b - avgNoise) ** 2, 0) / noiseValues.length;

  if (noiseVariance < 50 && avgNoise < 20) {
    score += 10;
    findings.push({
      severity: 'low',
      title: 'Unusually Uniform Noise Pattern',
      detail: `Noise variance: ${noiseVariance.toFixed(2)}. AI-generated images often show more uniform noise distribution compared to photographs.`
    });
  }

  return { score, findings };
}

export async function detectWatermarks(file, imageData, width, height) {
  const findings = [];
  let score = 0;
  const detectedWatermarks = [];

  // Read file binary data and search for watermark signatures
  const buffer = await readFileAsArrayBuffer(file);
  if (buffer) {
    for (const [key, sig] of Object.entries(WATERMARK_SIGNATURES)) {
      const matches = searchBinaryForPatterns(buffer, sig.patterns);
      if (matches.length > 0) {
        score += sig.weight;
        detectedWatermarks.push(sig.name);
        findings.push({
          severity: 'critical',
          title: `${sig.name} Detected`,
          detail: `Found watermark patterns: ${matches.join(', ')}. This is a strong indicator of AI-generated content.`
        });
      }
    }
  }

  // Also search the text representation
  const textContent = await readFileAsText(file);
  if (textContent) {
    for (const [key, sig] of Object.entries(WATERMARK_SIGNATURES)) {
      if (detectedWatermarks.includes(sig.name)) continue;
      const textLower = textContent.toLowerCase();
      const matches = sig.patterns.filter(p => textLower.includes(p.toLowerCase()));
      if (matches.length > 0) {
        score += Math.floor(sig.weight * 0.8);
        detectedWatermarks.push(sig.name);
        findings.push({
          severity: 'high',
          title: `${sig.name} Trace Found`,
          detail: `Found text-based watermark traces: ${matches.join(', ')}.`
        });
      }
    }
  }

  // If it's an image and we have pixel data, check for pixel-level watermarks
  if (imageData && width && height) {
    const pixelResult = analyzePixelWatermarks(imageData, width, height);
    score += pixelResult.score;
    findings.push(...pixelResult.findings);
  }

  if (findings.length === 0) {
    findings.push({
      severity: 'info',
      title: 'No Watermarks Detected',
      detail: 'No known AI watermark signatures were found. This does not rule out AI generation — many generators do not embed watermarks.'
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'Watermark Detection',
    score,
    findings,
    detectedWatermarks,
    icon: 'Fingerprint'
  };
}
