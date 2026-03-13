import exifr from 'exifr';

const AI_SOFTWARE_TAGS = [
  'dall-e', 'dalle', 'midjourney', 'stable diffusion', 'stablediffusion',
  'stability ai', 'adobe firefly', 'firefly', 'leonardo', 'runway',
  'pika', 'kling', 'sora', 'ideogram', 'flux', 'comfyui', 'automatic1111',
  'novelai', 'craiyon', 'deepai', 'nightcafe', 'artbreeder',
  'elevenlabs', 'murf', 'resemble', 'bark', 'tortoise-tts',
  'synthesia', 'heygen', 'descript', 'gen-2', 'gen-3',
  'photoshop ai', 'generative fill', 'generative expand',
  'ai generated', 'ai-generated', 'artificial intelligence'
];

const LEGITIMATE_CAMERAS = [
  'canon', 'nikon', 'sony', 'fujifilm', 'olympus', 'panasonic',
  'leica', 'pentax', 'hasselblad', 'phase one', 'gopro',
  'apple', 'samsung', 'google', 'huawei', 'xiaomi', 'oneplus', 'oppo'
];

export async function analyzeMetadata(file) {
  const findings = [];
  let score = 0;

  try {
    const metadata = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      iptc: true,
      gps: true,
      icc: true,
      jfif: true,
      ihdr: true,
      exif: true,
    });

    if (!metadata || Object.keys(metadata).length === 0) {
      score += 25;
      findings.push({
        severity: 'high',
        title: 'No Metadata Found',
        detail: 'File contains no EXIF/XMP/IPTC metadata. AI-generated files typically lack camera metadata entirely.'
      });
    } else {
      // Check for AI software tags
      const allValues = JSON.stringify(metadata).toLowerCase();
      const foundAITags = AI_SOFTWARE_TAGS.filter(tag => allValues.includes(tag));
      if (foundAITags.length > 0) {
        score += 40;
        findings.push({
          severity: 'critical',
          title: 'AI Software Detected in Metadata',
          detail: `Found AI generation tool references: ${foundAITags.join(', ')}. This strongly indicates AI generation.`
        });
      }

      // Check camera info
      const make = metadata.Make || metadata.make || '';
      const model = metadata.Model || metadata.model || '';
      const hasCamera = LEGITIMATE_CAMERAS.some(cam =>
        make.toLowerCase().includes(cam) || model.toLowerCase().includes(cam)
      );

      if (!make && !model) {
        score += 15;
        findings.push({
          severity: 'medium',
          title: 'No Camera Information',
          detail: 'No camera make/model found. Real photos typically contain camera identification data.'
        });
      } else if (hasCamera) {
        score -= 10;
        findings.push({
          severity: 'low',
          title: 'Valid Camera Detected',
          detail: `Camera: ${make} ${model}. This is a known legitimate camera/device.`
        });
      }

      // Check for GPS data
      if (!metadata.latitude && !metadata.longitude && !metadata.GPSLatitude) {
        score += 5;
        findings.push({
          severity: 'low',
          title: 'No GPS Data',
          detail: 'No geolocation data found. While not conclusive, real photos often include GPS metadata.'
        });
      }

      // Check DPI / resolution
      const xRes = metadata.XResolution || metadata.xResolution;
      const yRes = metadata.YResolution || metadata.yResolution;
      if (xRes && yRes) {
        if (xRes === 72 && yRes === 72) {
          score += 5;
          findings.push({
            severity: 'low',
            title: 'Default 72 DPI',
            detail: 'Resolution is set to 72 DPI, a common default for AI-generated and web-origin images.'
          });
        } else if (xRes !== yRes) {
          score += 10;
          findings.push({
            severity: 'medium',
            title: 'Mismatched DPI Values',
            detail: `X resolution (${xRes}) differs from Y resolution (${yRes}). This is unusual for camera-captured images.`
          });
        }
      }

      // Check for missing timestamps
      const dateFields = ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateTimeDigitized'];
      const missingDates = dateFields.filter(f => !metadata[f]);
      if (missingDates.length === dateFields.length) {
        score += 10;
        findings.push({
          severity: 'medium',
          title: 'No Date/Time Metadata',
          detail: 'No timestamp fields found in metadata. Camera-captured images typically record capture time.'
        });
      }

      // Check for unusual color space
      if (metadata.ColorSpace === 'Uncalibrated' || metadata.ColorSpace === 65535) {
        score += 5;
        findings.push({
          severity: 'low',
          title: 'Uncalibrated Color Space',
          detail: 'Color space is marked as uncalibrated, which is sometimes seen in AI-generated images.'
        });
      }

      // Check software field
      const software = (metadata.Software || metadata.software || '').toLowerCase();
      if (software) {
        const isAISoftware = AI_SOFTWARE_TAGS.some(tag => software.includes(tag));
        if (isAISoftware) {
          score += 30;
          findings.push({
            severity: 'critical',
            title: 'AI Generation Software in Metadata',
            detail: `Software field contains: "${metadata.Software || metadata.software}". Direct evidence of AI generation.`
          });
        } else {
          findings.push({
            severity: 'info',
            title: 'Software Identified',
            detail: `Software: ${metadata.Software || metadata.software}`
          });
        }
      }
    }
  } catch (err) {
    // If metadata parsing fails completely, that's suspicious for images
    if (file.type.startsWith('image/')) {
      score += 15;
      findings.push({
        severity: 'medium',
        title: 'Metadata Parse Failure',
        detail: 'Unable to parse metadata. Some AI generators produce files with non-standard or corrupt metadata structures.'
      });
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  return {
    name: 'Metadata Analysis',
    score,
    findings,
    icon: 'FileSearch'
  };
}
