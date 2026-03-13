/**
 * Threat Intelligence Module
 * Simulates hash-based lookups against known deepfake databases
 * and generates forensic threat assessments.
 */

async function computeFileHash(file) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function computePerceptualHash(imageData, width, height) {
  // Simple average hash (aHash) for perceptual similarity
  const size = 8;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const imgDataObj = new ImageData(new Uint8ClampedArray(imageData), width, height);
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = width;
  srcCanvas.height = height;
  srcCanvas.getContext('2d').putImageData(imgDataObj, 0, 0);

  ctx.drawImage(srcCanvas, 0, 0, size, size);
  const smallData = ctx.getImageData(0, 0, size, size).data;

  // Convert to grayscale and compute average
  const grays = [];
  for (let i = 0; i < smallData.length; i += 4) {
    grays.push(0.299 * smallData[i] + 0.587 * smallData[i + 1] + 0.114 * smallData[i + 2]);
  }

  const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
  let hash = '';
  for (const g of grays) {
    hash += g > avg ? '1' : '0';
  }

  return hash;
}

export async function runThreatIntelligence(file, imageData, width, height, analysisResults) {
  const findings = [];
  let score = 0;
  const threatData = {};

  // 1. Compute file hash
  const fileHash = await computeFileHash(file);
  threatData.sha256 = fileHash;

  // 2. Compute perceptual hash (for images)
  if (imageData && width && height) {
    threatData.pHash = computePerceptualHash(imageData, width, height);
  }

  // 3. File signature analysis
  const fileSizeKB = file.size / 1024;
  threatData.fileSize = fileSizeKB;
  threatData.mimeType = file.type;

  // 4. Threat assessment based on all analysis results
  const highRiskFindings = [];
  let totalHighSeverity = 0;

  if (analysisResults) {
    for (const result of analysisResults) {
      const criticals = result.findings.filter(f => f.severity === 'critical');
      const highs = result.findings.filter(f => f.severity === 'high');
      totalHighSeverity += criticals.length * 2 + highs.length;
      highRiskFindings.push(...criticals.map(f => ({ source: result.name, ...f })));
    }
  }

  // 5. Generate threat level
  let threatLevel;
  if (totalHighSeverity >= 6) {
    threatLevel = 'CRITICAL';
    score += 30;
  } else if (totalHighSeverity >= 3) {
    threatLevel = 'HIGH';
    score += 20;
  } else if (totalHighSeverity >= 1) {
    threatLevel = 'MODERATE';
    score += 10;
  } else {
    threatLevel = 'LOW';
  }

  threatData.threatLevel = threatLevel;

  findings.push({
    severity: threatLevel === 'CRITICAL' ? 'critical' : threatLevel === 'HIGH' ? 'high' : threatLevel === 'MODERATE' ? 'medium' : 'low',
    title: `Threat Level: ${threatLevel}`,
    detail: `Based on ${totalHighSeverity} high-severity indicators across all analysis modules. File hash: ${fileHash.substring(0, 16)}...`
  });

  // 6. Known signature database check (simulated)
  const knownPatterns = [
    { name: 'ThisPersonDoesNotExist', sizeRange: [100, 500], dimRange: [1024, 1024], type: 'image/jpeg' },
    { name: 'DeepFake Video', sizeRange: [1000, 50000], type: 'video/mp4' },
    { name: 'AI Voice Clone', sizeRange: [50, 2000], type: 'audio/mpeg' }
  ];

  for (const pattern of knownPatterns) {
    if (file.type === pattern.type && fileSizeKB >= pattern.sizeRange[0] && fileSizeKB <= pattern.sizeRange[1]) {
      findings.push({
        severity: 'medium',
        title: `Pattern Match: ${pattern.name}`,
        detail: `File characteristics (type, size) match the profile of known ${pattern.name} outputs. This is a heuristic match — not a confirmed identification.`
      });
    }
  }

  // 7. MIME type / extension mismatch check
  const ext = file.name.split('.').pop()?.toLowerCase();
  const expectedMimes = {
    'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
    'gif': 'image/gif', 'webp': 'image/webp', 'mp3': 'audio/mpeg',
    'wav': 'audio/wav', 'mp4': 'video/mp4', 'webm': 'video/webm'
  };

  if (ext && expectedMimes[ext] && file.type !== expectedMimes[ext]) {
    score += 10;
    findings.push({
      severity: 'high',
      title: 'MIME Type Mismatch',
      detail: `File extension ".${ext}" expects ${expectedMimes[ext]}, but actual MIME type is ${file.type}. This mismatch can indicate file tampering or format spoofing.`
    });
  }

  // 8. Forensic metadata summary
  findings.push({
    severity: 'info',
    title: 'Forensic Identifiers',
    detail: `SHA-256: ${fileHash.substring(0, 32)}... | Size: ${fileSizeKB.toFixed(1)} KB | Type: ${file.type}${threatData.pHash ? ` | pHash: ${threatData.pHash.substring(0, 16)}...` : ''}`
  });

  return {
    name: 'Threat Intelligence',
    score: Math.min(score, 100),
    findings,
    threatData,
    icon: 'AlertTriangle'
  };
}
