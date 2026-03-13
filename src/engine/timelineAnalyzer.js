/**
 * Digital Evidence Timeline Analyzer
 * Checks file timestamps for impossible anomalies and rapid modification patterns
 */

import exifr from 'exifr';

export async function analyzeTimeline(file) {
  const findings = [];
  let score = 0;
  const events = [];

  // 1. Get File object timestamps
  const fileLastModified = file.lastModified ? new Date(file.lastModified) : null;
  const now = new Date();

  if (fileLastModified) {
    events.push({
      type: 'file_modified',
      date: fileLastModified,
      label: 'File Last Modified',
      source: 'File System'
    });
  }

  // 2. Extract metadata timestamps
  let metadata = null;
  try {
    metadata = await exifr.parse(file, {
      tiff: true, xmp: true, iptc: true, exif: true,
      pick: [
        'DateTimeOriginal', 'CreateDate', 'ModifyDate',
        'DateTimeDigitized', 'MetadataDate', 'xmp:CreateDate',
        'xmp:ModifyDate', 'iptc:DateCreated', 'iptc:TimeCreated'
      ]
    });
  } catch (e) {
    // Metadata parsing failure is handled elsewhere
  }

  if (metadata) {
    const dateFields = {
      'DateTimeOriginal': 'Original Capture',
      'CreateDate': 'Created',
      'ModifyDate': 'Modified (Metadata)',
      'DateTimeDigitized': 'Digitized',
      'MetadataDate': 'Metadata Updated'
    };

    for (const [field, label] of Object.entries(dateFields)) {
      if (metadata[field]) {
        const date = new Date(metadata[field]);
        if (!isNaN(date.getTime())) {
          events.push({
            type: field.toLowerCase(),
            date,
            label,
            source: 'EXIF/XMP Metadata'
          });
        }
      }
    }
  }

  // Sort events by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  // 3. Anomaly Detection

  // Check for future dates
  const futureDates = events.filter(e => e.date > now);
  if (futureDates.length > 0) {
    score += 20;
    findings.push({
      severity: 'critical',
      title: 'Future Date Detected',
      detail: `Found ${futureDates.length} timestamp(s) in the future: ${futureDates.map(e => `${e.label}: ${e.date.toISOString()}`).join('; ')}. This is impossible for legitimate capture.`
    });
    futureDates.forEach(e => e.anomaly = 'future_date');
  }

  // Check for creation after modification (impossible)
  const createEvent = events.find(e =>
    e.type === 'createdate' || e.type === 'datetimeoriginal'
  );
  const modifyEvent = events.find(e =>
    e.type === 'modifydate' || e.type === 'file_modified'
  );

  if (createEvent && modifyEvent && createEvent.date > modifyEvent.date) {
    score += 25;
    findings.push({
      severity: 'critical',
      title: 'Impossible Timeline: Created After Modified',
      detail: `Creation date (${createEvent.date.toISOString()}) is after modification date (${modifyEvent.date.toISOString()}). This is physically impossible and indicates tampering or synthetic generation.`
    });
    createEvent.anomaly = 'impossible_order';
    modifyEvent.anomaly = 'impossible_order';
  }

  // Check for zero-duration creation (created and modified at exact same time)
  if (createEvent && modifyEvent) {
    const diffMs = Math.abs(createEvent.date.getTime() - modifyEvent.date.getTime());
    if (diffMs === 0) {
      score += 15;
      findings.push({
        severity: 'high',
        title: 'Zero-Duration Edit',
        detail: 'Creation and modification timestamps are identical (0ms difference). This suggests the file was created programmatically in a single operation, typical of AI generation.'
      });
      createEvent.anomaly = 'zero_duration';
      modifyEvent.anomaly = 'zero_duration';
    }
  }

  // *** CRITICAL CHECK: Rapid modification pattern (< 2 minutes) ***
  if (events.length >= 2) {
    const firstEvent = events[0];
    const lastEvent = events[events.length - 1];
    const totalSpanMs = lastEvent.date.getTime() - firstEvent.date.getTime();
    const totalSpanMinutes = totalSpanMs / 60000;

    if (totalSpanMinutes >= 0 && totalSpanMinutes <= 2 && events.length >= 2) {
      // Heavy modifications within 2 minutes
      const modificationEvents = events.filter(e =>
        e.type !== 'datetimeoriginal' && e.type !== 'createdate'
      );

      if (modificationEvents.length > 0 || totalSpanMs > 0) {
        score += 30;
        findings.push({
          severity: 'critical',
          title: '⚡ Rapid Modification Detected (< 2 min)',
          detail: `All file events span only ${totalSpanMinutes.toFixed(2)} minutes (${(totalSpanMs / 1000).toFixed(1)}s). Heavy modifications within a 2-minute window is a strong indicator of AI generation — real photos and edits typically span much longer periods.`
        });
        events.forEach(e => e.anomaly = e.anomaly || 'rapid_modification');
      }
    }

    // Even if > 2 min, check for suspicious patterns
    if (totalSpanMinutes > 2 && totalSpanMinutes < 5 && events.length >= 3) {
      score += 10;
      findings.push({
        severity: 'medium',
        title: 'Fast Editing Pace',
        detail: `Multiple timestamps within ${totalSpanMinutes.toFixed(1)} minutes. While not as suspicious as sub-2-minute edits, this is faster than typical manual editing workflows.`
      });
    }
  }

  // Check for very old or suspiciously precise timestamps
  events.forEach(event => {
    const year = event.date.getFullYear();
    if (year < 2000) {
      score += 10;
      findings.push({
        severity: 'medium',
        title: 'Suspiciously Old Date',
        detail: `${event.label} is dated ${event.date.toISOString()} (before year 2000). This may indicate default/placeholder timestamps from AI generation.`
      });
      event.anomaly = 'suspicious_date';
    }

    // Check for Unix epoch (1970-01-01)
    if (year === 1970) {
      score += 15;
      findings.push({
        severity: 'high',
        title: 'Unix Epoch Date',
        detail: `${event.label} is set to Unix epoch (Jan 1, 1970). This is a default value indicating the timestamp was never properly set.`
      });
      event.anomaly = 'epoch_date';
    }
  });

  // No timestamps at all
  if (events.length === 0) {
    score += 10;
    findings.push({
      severity: 'medium',
      title: 'No Timeline Data',
      detail: 'No timestamp information could be extracted. AI-generated files often lack any timeline data.'
    });
  } else if (events.length === 1) {
    score += 5;
    findings.push({
      severity: 'low',
      title: 'Limited Timeline Data',
      detail: 'Only one timestamp found. Real camera photos typically have multiple date fields (capture, digitize, modify).'
    });
  }

  // If no anomalies found with timestamps
  if (findings.length === 0 && events.length > 1) {
    findings.push({
      severity: 'info',
      title: 'Timeline Appears Consistent',
      detail: 'Timestamps follow a logical order with no impossible anomalies detected.'
    });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: 'Digital Evidence Timeline',
    score,
    findings,
    events,
    icon: 'Clock'
  };
}
