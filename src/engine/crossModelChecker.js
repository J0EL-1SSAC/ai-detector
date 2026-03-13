/**
 * Cross-Model Consistency Checker
 * Compares file characteristics against known signatures of different AI models
 */

const AI_MODELS = {
  'DALL-E 3': {
    category: 'image',
    signatures: {
      metadata: ['openai', 'dall-e', 'dalle'],
      dimensions: [[1024, 1024], [1792, 1024], [1024, 1792]],
      format: ['png', 'webp'],
      characteristics: {
        typicalDPI: 72,
        hasExif: false,
        typicalSizeRange: [500, 5000], // KB
        colorProfile: 'sRGB'
      }
    }
  },
  'Midjourney': {
    category: 'image',
    signatures: {
      metadata: ['midjourney', 'mj_'],
      dimensions: [[1024, 1024], [1456, 816], [816, 1456], [1344, 768], [768, 1344]],
      format: ['png', 'jpg', 'webp'],
      characteristics: {
        typicalDPI: 72,
        hasExif: false,
        typicalSizeRange: [300, 8000],
        colorProfile: 'sRGB'
      }
    }
  },
  'Stable Diffusion': {
    category: 'image',
    signatures: {
      metadata: ['stablediffusion', 'stability', 'automatic1111', 'comfyui', 'sd_model', 'CFG scale'],
      dimensions: [[512, 512], [768, 768], [1024, 1024], [512, 768], [768, 512]],
      format: ['png', 'jpg'],
      characteristics: {
        typicalDPI: 72,
        hasExif: true, // A1111 adds EXIF
        typicalSizeRange: [200, 6000],
        colorProfile: 'sRGB'
      }
    }
  },
  'Adobe Firefly': {
    category: 'image',
    signatures: {
      metadata: ['firefly', 'adobe', 'content credentials', 'c2pa'],
      dimensions: [[1024, 1024], [1792, 1024], [1024, 1792], [2048, 2048]],
      format: ['png', 'jpg', 'webp'],
      characteristics: {
        typicalDPI: 72,
        hasExif: true,
        typicalSizeRange: [300, 8000],
        hasC2PA: true,
        colorProfile: 'sRGB'
      }
    }
  },
  'Google Imagen': {
    category: 'image',
    signatures: {
      metadata: ['google', 'imagen', 'synthid'],
      dimensions: [[1024, 1024], [1536, 1536]],
      format: ['png', 'webp'],
      characteristics: {
        typicalDPI: 72,
        hasExif: false,
        typicalSizeRange: [400, 6000],
        hasSynthID: true
      }
    }
  },
  'Flux': {
    category: 'image',
    signatures: {
      metadata: ['flux', 'black forest labs'],
      dimensions: [[1024, 1024], [768, 1344], [1344, 768]],
      format: ['png', 'jpg', 'webp'],
      characteristics: {
        typicalDPI: 72,
        hasExif: false,
        typicalSizeRange: [300, 7000]
      }
    }
  },
  'ElevenLabs': {
    category: 'audio',
    signatures: {
      metadata: ['elevenlabs', 'eleven labs'],
      format: ['mp3', 'wav', 'ogg'],
      characteristics: {
        typicalSizeRange: [10, 5000],
        sampleRate: 44100
      }
    }
  },
  'Suno AI': {
    category: 'audio',
    signatures: {
      metadata: ['suno', 'suno.ai'],
      format: ['mp3', 'wav'],
      characteristics: {
        typicalSizeRange: [500, 15000]
      }
    }
  },
  'Sora': {
    category: 'video',
    signatures: {
      metadata: ['sora', 'openai'],
      format: ['mp4', 'webm'],
      characteristics: {
        typicalSizeRange: [1000, 50000],
        maxDuration: 60
      }
    }
  },
  'Runway Gen-3': {
    category: 'video',
    signatures: {
      metadata: ['runway', 'gen-3', 'gen3'],
      format: ['mp4', 'webm'],
      characteristics: {
        typicalSizeRange: [500, 30000],
        maxDuration: 18
      }
    }
  }
};

export async function checkCrossModelConsistency(file, metadataResult, watermarkResult, imageWidth, imageHeight) {
  const findings = [];
  const modelScores = {};
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const fileSizeKB = file.size / 1024;
  const fileType = file.type.split('/')[0]; // 'image', 'audio', 'video'

  // Get metadata text for searching
  const metadataText = (metadataResult?.findings || [])
    .map(f => `${f.title} ${f.detail}`)
    .join(' ')
    .toLowerCase();

  const watermarkText = (watermarkResult?.findings || [])
    .map(f => `${f.title} ${f.detail}`)
    .join(' ')
    .toLowerCase();

  const combinedText = metadataText + ' ' + watermarkText;

  for (const [modelName, model] of Object.entries(AI_MODELS)) {
    // Only compare same-category models
    if (model.category !== fileType) {
      modelScores[modelName] = { score: 0, reasons: [], category: model.category };
      continue;
    }

    let score = 0;
    const reasons = [];

    // Check metadata signatures
    const metadataMatches = model.signatures.metadata.filter(sig =>
      combinedText.includes(sig.toLowerCase())
    );
    if (metadataMatches.length > 0) {
      score += 40;
      reasons.push(`Metadata matches: ${metadataMatches.join(', ')}`);
    }

    // Check format
    if (model.signatures.format?.includes(fileExt)) {
      score += 5;
      reasons.push(`File format (${fileExt}) matches typical output`);
    }

    // Check dimensions (for images)
    if (model.signatures.dimensions && imageWidth && imageHeight) {
      const dimMatch = model.signatures.dimensions.some(
        ([w, h]) => (w === imageWidth && h === imageHeight) ||
                     (Math.abs(w - imageWidth) < 10 && Math.abs(h - imageHeight) < 10)
      );
      if (dimMatch) {
        score += 20;
        reasons.push(`Dimensions (${imageWidth}x${imageHeight}) match default output size`);
      }

      // Check aspect ratio match
      const fileRatio = imageWidth / imageHeight;
      const ratioMatch = model.signatures.dimensions.some(([w, h]) => {
        const modelRatio = w / h;
        return Math.abs(fileRatio - modelRatio) < 0.05;
      });
      if (ratioMatch && !dimMatch) {
        score += 10;
        reasons.push(`Aspect ratio matches typical output ratio`);
      }
    }

    // Check file size range
    if (model.signatures.characteristics?.typicalSizeRange) {
      const [minKB, maxKB] = model.signatures.characteristics.typicalSizeRange;
      if (fileSizeKB >= minKB && fileSizeKB <= maxKB) {
        score += 5;
        reasons.push(`File size (${fileSizeKB.toFixed(0)} KB) within typical range`);
      }
    }

    // Check watermark-specific markers
    if (model.signatures.characteristics?.hasC2PA && combinedText.includes('c2pa')) {
      score += 15;
      reasons.push('C2PA content credentials detected');
    }
    if (model.signatures.characteristics?.hasSynthID && combinedText.includes('synthid')) {
      score += 15;
      reasons.push('SynthID watermark detected');
    }

    modelScores[modelName] = {
      score: Math.min(score, 100),
      reasons,
      category: model.category
    };
  }

  // Find top matches
  const sortedModels = Object.entries(modelScores)
    .filter(([_, data]) => data.category === fileType)
    .sort((a, b) => b[1].score - a[1].score);

  const topModel = sortedModels[0];
  const overallScore = topModel ? topModel[1].score : 0;

  if (topModel && topModel[1].score > 30) {
    findings.push({
      severity: 'high',
      title: `Most Likely Source: ${topModel[0]}`,
      detail: `${topModel[1].score}% match. Reasons: ${topModel[1].reasons.join('; ')}`
    });
  }

  // Add runner-ups
  sortedModels.slice(1, 3).forEach(([name, data]) => {
    if (data.score > 10) {
      findings.push({
        severity: 'medium',
        title: `Possible Match: ${name}`,
        detail: `${data.score}% match. ${data.reasons.join('; ')}`
      });
    }
  });

  if (findings.length === 0) {
    findings.push({
      severity: 'info',
      title: 'No Strong Model Match',
      detail: 'The file does not strongly match any specific known AI model signature. It may be from a less common generator or be authentic.'
    });
  }

  return {
    name: 'Cross-Model Check',
    score: overallScore,
    findings,
    modelScores: Object.fromEntries(
      sortedModels.map(([name, data]) => [name, data.score])
    ),
    icon: 'GitCompare'
  };
}
