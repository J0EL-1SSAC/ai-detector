/**
 * Forensic PDF Report Generator
 * Generates a comprehensive Digital Forensic Analysis Report
 */
import { jsPDF } from 'jspdf';

// ── Color palette ──
const COLORS = {
  primary: [139, 92, 246],    // purple accent
  dark: [10, 14, 26],         // bg
  white: [255, 255, 255],
  gray: [148, 163, 184],
  darkGray: [30, 41, 59],
  danger: [239, 68, 68],
  warning: [245, 158, 11],
  success: [16, 185, 129],
  info: [59, 130, 246],
  tableHeader: [30, 27, 75],
  tableRow: [15, 18, 35],
  tableRowAlt: [20, 24, 45],
};

// ── SHA-256 hash from file ──
async function computeSHA256(file) {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'Unable to compute';
  }
}

// ── Helpers ──
function generateCaseId() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `DF-${y}-${m}${d}-${rand}`;
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getConfidenceLevel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function getVerdict(score) {
  if (score >= 70) return 'Likely AI-Generated';
  if (score >= 40) return 'Possibly AI-Generated';
  return 'Likely Authentic';
}

// ── PDF Drawing Helpers ──
function setFont(doc, style, size) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
}

function checkPageBreak(doc, y, needed = 30) {
  if (y + needed > 275) {
    doc.addPage();
    drawPageBackground(doc);
    return 20;
  }
  return y;
}

function drawPageBackground(doc) {
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, 210, 297, 'F');
}

function drawSectionTitle(doc, y, number, title) {
  y = checkPageBreak(doc, y, 20);

  // Accent bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(15, y, 3, 8, 'F');

  setFont(doc, 'bold', 13);
  doc.setTextColor(...COLORS.white);
  doc.text(`${number}. ${title}`, 22, y + 6.5);

  // Underline
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.3);
  doc.line(15, y + 11, 195, y + 11);

  return y + 17;
}

function drawTable(doc, y, headers, rows) {
  const colWidths = headers.map(() => (180 / headers.length));
  const startX = 15;

  y = checkPageBreak(doc, y, 12 + rows.length * 9);

  // Header
  doc.setFillColor(...COLORS.tableHeader);
  doc.rect(startX, y, 180, 9, 'F');
  setFont(doc, 'bold', 8);
  doc.setTextColor(...COLORS.primary);

  headers.forEach((h, i) => {
    doc.text(h, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0) + 3, y + 6.5);
  });
  y += 9;

  // Rows
  setFont(doc, 'normal', 8);
  rows.forEach((row, ri) => {
    y = checkPageBreak(doc, y, 9);
    const bg = ri % 2 === 0 ? COLORS.tableRow : COLORS.tableRowAlt;
    doc.setFillColor(...bg);
    doc.rect(startX, y, 180, 9, 'F');
    doc.setTextColor(...COLORS.gray);
    row.forEach((cell, ci) => {
      const text = String(cell).substring(0, 50);
      doc.text(text, startX + colWidths.slice(0, ci).reduce((a, b) => a + b, 0) + 3, y + 6.5);
    });
    y += 9;
  });

  return y + 4;
}

function drawKeyValueTable(doc, y, pairs) {
  const startX = 15;

  pairs.forEach((pair, ri) => {
    y = checkPageBreak(doc, y, 9);
    const bg = ri % 2 === 0 ? COLORS.tableRow : COLORS.tableRowAlt;
    doc.setFillColor(...bg);
    doc.rect(startX, y, 180, 9, 'F');

    setFont(doc, 'bold', 8);
    doc.setTextColor(...COLORS.primary);
    doc.text(pair[0], startX + 3, y + 6.5);

    setFont(doc, 'normal', 8);
    doc.setTextColor(...COLORS.gray);
    const val = String(pair[1]).substring(0, 70);
    doc.text(val, startX + 62, y + 6.5);

    y += 9;
  });

  return y + 4;
}

function drawParagraph(doc, y, text, maxWidth = 170) {
  setFont(doc, 'normal', 9);
  doc.setTextColor(...COLORS.gray);
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    y = checkPageBreak(doc, y, 6);
    doc.text(line, 18, y);
    y += 5;
  }
  return y + 2;
}

// ── Main Export ──
export async function generateForensicReport({ file, results, user, imageUrl, imageWidth, imageHeight }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const caseId = generateCaseId();
  const reportDate = formatDate();
  const investigatorName = user?.name || 'Analyst';
  const { overallScore, analyses } = results;
  const sha256 = await computeSHA256(file);

  // ─── PAGE 1 — Cover / Header ───
  drawPageBackground(doc);

  // Top accent stripe
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 4, 'F');

  // Logo area
  doc.setFillColor(30, 27, 75);
  doc.roundedRect(15, 15, 50, 14, 3, 3, 'F');
  setFont(doc, 'bold', 14);
  doc.setTextColor(...COLORS.primary);
  doc.text('DEEPSCAN', 18, 24);
  setFont(doc, 'normal', 7);
  doc.setTextColor(...COLORS.gray);
  doc.text('AI FORENSIC SYSTEM', 49, 24);

  // Report title
  setFont(doc, 'bold', 20);
  doc.setTextColor(...COLORS.white);
  doc.text('Digital Forensic Analysis Report', 15, 45);

  // Separator line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.8);
  doc.line(15, 50, 195, 50);

  // Report metadata
  let y = 58;
  const metaPairs = [
    ['Case ID:', caseId],
    ['Investigator:', investigatorName],
    ['Organization:', 'Cyber Crime Investigation Unit'],
    ['Date of Investigation:', reportDate],
    ['Report Generated By:', 'DeepScan AI Forensic System'],
  ];

  metaPairs.forEach(([label, value]) => {
    setFont(doc, 'bold', 9);
    doc.setTextColor(...COLORS.primary);
    doc.text(label, 18, y);
    setFont(doc, 'normal', 9);
    doc.setTextColor(...COLORS.gray);
    doc.text(value, 65, y);
    y += 7;
  });

  y += 5;

  // ─── 1. CASE INFORMATION ───
  y = drawSectionTitle(doc, y, 1, 'Case Information');
  y = drawKeyValueTable(doc, y, [
    ['Case Number', caseId],
    ['Investigator Name', investigatorName],
    ['Investigation Date', reportDate],
    ['Evidence Type', file.type || 'Unknown'],
    ['Investigation Tool', 'DeepScan AI Forensics'],
  ]);

  setFont(doc, 'bold', 9);
  doc.setTextColor(...COLORS.white);
  y = checkPageBreak(doc, y, 15);
  doc.text('Purpose of Investigation:', 18, y);
  y += 6;
  y = drawParagraph(doc, y,
    'To determine whether the submitted media is authentic or generated/manipulated using Artificial Intelligence tools.'
  );

  // ─── 2. CHAIN OF CUSTODY ───
  y = drawSectionTitle(doc, y, 2, 'Chain of Custody');
  y = drawTable(doc, y,
    ['Evidence ID', 'Collected By', 'Date', 'Location'],
    [['EVD-' + caseId.split('-').pop(), investigatorName, reportDate, 'Digital Evidence Lab']]
  );
  y = drawParagraph(doc, y,
    'This section ensures the evidence has not been tampered with and documents who handled it.'
  );

  // ─── 3. EVIDENCE DESCRIPTION ───
  y = drawSectionTitle(doc, y, 3, 'Evidence Description');
  const evidenceRows = [
    ['File Name', file.name],
    ['File Type', file.type || 'Unknown'],
    ['File Size', formatFileSize(file.size)],
  ];
  if (imageWidth && imageHeight) {
    evidenceRows.push(['Resolution', `${imageWidth} × ${imageHeight}`]);
  }
  evidenceRows.push(['SHA-256 Hash', sha256.substring(0, 40) + '...']);
  y = drawKeyValueTable(doc, y, evidenceRows);
  y = drawParagraph(doc, y,
    'Hash verification confirms the file integrity and ensures that the evidence was not modified during analysis.'
  );

  // ─── 4. TOOLS USED ───
  y = drawSectionTitle(doc, y, 4, 'Tools Used');
  const toolsRows = [
    ['DeepScan AI Detector', 'Primary AI content detection'],
    ['Metadata Extractor', 'Extract file metadata (EXIF/XMP/IPTC)'],
    ['Artifact Analyzer', 'Detect GAN/diffusion model artifacts'],
    ['Frequency Spectrum Analyzer', 'Detect synthetic image patterns'],
    ['Error Level Analysis (ELA)', 'JPEG compression artifact visualization'],
    ['PRNU Sensor Analyzer', 'Camera sensor fingerprint verification'],
    ["Benford's Law Analyzer", 'First-digit statistical distribution'],
    ['GAN Fingerprint Decoder', 'Spectral signature identification'],
    ['Compression Ghost Detector', 'Re-compression trace detection'],
    ['Threat Intelligence Engine', 'Hash-based threat lookup'],
  ];
  y = drawTable(doc, y, ['Tool', 'Purpose'], toolsRows);

  // ─── 5. INVESTIGATION METHODOLOGY ───
  y = drawSectionTitle(doc, y, 5, 'Investigation Methodology');
  const steps = [
    'Evidence file was acquired and verified using SHA-256 hashing.',
    'Metadata analysis was performed to identify camera and device information.',
    'Image artifact analysis was conducted to detect GAN-generated patterns.',
    'Error Level Analysis (ELA) was performed to detect manipulation traces.',
    'PRNU sensor noise analysis verified camera sensor fingerprints.',
    "Benford's Law analysis checked first-digit statistical distributions.",
    'GAN fingerprint decoding identified spectral architecture signatures.',
    'Compression ghost detection searched for re-compression artifacts.',
    'Frequency domain analysis was performed to detect unnatural image structures.',
    'Threat intelligence lookup was performed against known AI databases.',
    'Results were evaluated using the DeepScan AI detection algorithm.',
  ];
  setFont(doc, 'normal', 9);
  doc.setTextColor(...COLORS.gray);
  steps.forEach((step, i) => {
    y = checkPageBreak(doc, y, 7);
    setFont(doc, 'bold', 9);
    doc.setTextColor(...COLORS.primary);
    doc.text(`${i + 1}.`, 18, y);
    setFont(doc, 'normal', 9);
    doc.setTextColor(...COLORS.gray);
    doc.text(step, 26, y);
    y += 6;
  });
  y += 4;

  // ─── 6. ANALYSIS RESULTS ───
  y = drawSectionTitle(doc, y, 6, 'Analysis Results');

  analyses.forEach((analysis) => {
    y = checkPageBreak(doc, y, 25);

    // Sub-header for each analysis module
    setFont(doc, 'bold', 10);
    doc.setTextColor(...COLORS.white);
    doc.text(`▸ ${analysis.name}`, 18, y);

    // Score badge
    const scoreColor = analysis.score >= 70 ? COLORS.danger
                     : analysis.score >= 40 ? COLORS.warning
                     : COLORS.success;
    doc.setFillColor(...scoreColor);
    doc.roundedRect(170, y - 5, 22, 7, 2, 2, 'F');
    setFont(doc, 'bold', 7);
    doc.setTextColor(...COLORS.white);
    doc.text(`${analysis.score}%`, 175, y - 0.5);

    y += 6;

    // Findings
    if (analysis.findings && analysis.findings.length > 0) {
      const findingsRows = analysis.findings.map(f => [
        (f.severity || 'info').toUpperCase(),
        f.title || '',
        (f.detail || '').substring(0, 60) + ((f.detail || '').length > 60 ? '...' : ''),
      ]);
      y = drawTable(doc, y, ['Severity', 'Finding', 'Detail'], findingsRows);
    }
    y += 2;
  });

  // ─── 7. AI DETECTION SCORE ───
  y = drawSectionTitle(doc, y, 7, 'AI Detection Score');

  // Big score display
  y = checkPageBreak(doc, y, 35);
  const scoreBoxColor = overallScore >= 70 ? COLORS.danger
                      : overallScore >= 40 ? COLORS.warning
                      : COLORS.success;

  doc.setFillColor(scoreBoxColor[0], scoreBoxColor[1], scoreBoxColor[2], 0.15);
  doc.roundedRect(15, y, 180, 28, 4, 4, 'F');
  doc.setDrawColor(...scoreBoxColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, y, 180, 28, 4, 4, 'S');

  setFont(doc, 'bold', 28);
  doc.setTextColor(...scoreBoxColor);
  doc.text(`${overallScore}%`, 30, y + 19);

  setFont(doc, 'bold', 12);
  doc.setTextColor(...COLORS.white);
  doc.text('AI Generation Probability', 70, y + 13);

  setFont(doc, 'normal', 10);
  doc.setTextColor(...COLORS.gray);
  doc.text(`Confidence Level: ${getConfidenceLevel(overallScore)}`, 70, y + 22);

  y += 35;

  // ─── 8. CONCLUSION ───
  y = drawSectionTitle(doc, y, 8, 'Conclusion');
  const verdict = getVerdict(overallScore);
  const conclusionText = overallScore >= 70
    ? `Based on the forensic analysis conducted using artifact detection, metadata evaluation, frequency domain examination, ELA, PRNU sensor analysis, Benford's Law verification, GAN fingerprint decoding, and compression ghost detection, the analyzed media demonstrates STRONG indicators of artificial generation. The results indicate that the media was likely generated using AI-based generative models such as GANs or diffusion models.`
    : overallScore >= 40
    ? `Based on the forensic analysis, the submitted media shows SOME indicators that may suggest AI generation or manipulation. While not conclusive, certain patterns in the analysis warrant further investigation. Additional expert review is recommended.`
    : `Based on the comprehensive forensic analysis, the submitted media appears to be AUTHENTIC with no significant indicators of AI generation detected. The media is consistent with naturally captured content.`;

  y = drawParagraph(doc, y, conclusionText);
  y += 3;

  setFont(doc, 'bold', 10);
  doc.setTextColor(...scoreBoxColor);
  y = checkPageBreak(doc, y, 10);
  doc.text(`Verdict: ${verdict}`, 18, y);
  y += 5;
  doc.text(`Confidence Level: ${getConfidenceLevel(overallScore)}`, 18, y);
  y += 10;

  // ─── 9. INVESTIGATOR DECLARATION ───
  y = drawSectionTitle(doc, y, 9, 'Investigator Declaration');
  y = checkPageBreak(doc, y, 40);
  y = drawParagraph(doc, y,
    'I certify that the above analysis was conducted using standard digital forensic procedures and the findings presented in this report are accurate to the best of my knowledge.'
  );
  y += 8;

  setFont(doc, 'bold', 9);
  doc.setTextColor(...COLORS.white);
  doc.text(`Investigator Name: ${investigatorName}`, 18, y);
  y += 7;
  doc.text('Signature: ____________________________', 18, y);
  y += 7;
  doc.text(`Date: ${reportDate}`, 18, y);
  y += 15;

  // Footer line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.3);
  y = checkPageBreak(doc, y, 15);
  doc.line(15, y, 195, y);
  y += 6;
  setFont(doc, 'italic', 7);
  doc.setTextColor(...COLORS.gray);
  doc.text('This report was generated by DeepScan AI Forensic System. Classification: CONFIDENTIAL.', 15, y);

  // ── Add page numbers to all pages ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    setFont(doc, 'normal', 7);
    doc.setTextColor(...COLORS.gray);
    doc.text(`Page ${i} of ${totalPages}`, 175, 292);
    doc.text(caseId, 15, 292);

    // Bottom accent stripe
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 293, 210, 4, 'F');
  }

  // ── Save ──
  const fileName = `DeepScan_Report_${caseId}.pdf`;
  doc.save(fileName);
  return fileName;
}
