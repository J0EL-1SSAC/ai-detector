import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import ResultsDashboard from '../components/ResultsDashboard';
import { analyzeMetadata } from '../engine/metadataAnalyzer';
import { detectWatermarks } from '../engine/watermarkDetector';
import { scanArtifacts } from '../engine/artifactScanner';
import { generateConfidenceMap } from '../engine/confidenceMapper';
import { checkCrossModelConsistency } from '../engine/crossModelChecker';
import { analyzeTimeline } from '../engine/timelineAnalyzer';
import { performELA } from '../engine/elaAnalyzer';
import { analyzePRNU } from '../engine/prnuAnalyzer';
import { analyzeBenfordsLaw } from '../engine/benfordAnalyzer';
import { decodeGANFingerprint } from '../engine/ganFingerprint';
import { detectCompressionGhosts } from '../engine/compressionGhost';
import { runThreatIntelligence } from '../engine/threatIntel';

function loadImagePixels(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve({ imageData: null, width: 0, height: 0, imageUrl: null });
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 1024;
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = maxDim / Math.max(w, h);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h).data;
      resolve({ imageData, width: w, height: h, imageUrl: url });
    };
    img.onerror = () => resolve({ imageData: null, width: 0, height: 0, imageUrl: null });
    img.src = url;
  });
}

export default function ScanPage({ scanMode, onBack, user, onUpdateUser }) {
  const [results, setResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [confidenceMap, setConfidenceMap] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [progress, setProgress] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const handleFileSelect = useCallback(async (file) => {
    setIsAnalyzing(true);
    setResults(null);
    setConfidenceMap(null);
    setImageUrl(null);
    setUploadedFile(file);

    try {
      setProgress('Loading file...');
      const { imageData, width, height, imageUrl: url } = await loadImagePixels(file);
      setImageDimensions({ width, height });
      if (url) setImageUrl(url);

      let analyses = [];
      let crossModelScores = {};
      let timelineData = null;

      if (scanMode === 'scan' || scanMode === 'batch') {
        // Full forensic scan — all core + advanced analyses
        setProgress('Running metadata analysis...');
        const metadataResult = await analyzeMetadata(file);

        setProgress('Scanning for watermarks...');
        const watermarkResult = await detectWatermarks(file, imageData, width, height);

        setProgress('Checking model artifacts...');
        const artifactResult = await scanArtifacts(file, imageData, width, height);

        setProgress('Analyzing timeline...');
        const timelineResult = await analyzeTimeline(file);
        timelineData = timelineResult;

        setProgress('Cross-model checking...');
        const crossModelResult = await checkCrossModelConsistency(
          file, metadataResult, watermarkResult, width, height
        );
        crossModelScores = crossModelResult.modelScores;

        analyses = [metadataResult, watermarkResult, artifactResult, crossModelResult, timelineResult];

        // Run advanced analyses for images
        if (imageData) {
          setProgress('Running Error Level Analysis...');
          const elaResult = await performELA(imageData, width, height);
          analyses.push(elaResult);

          setProgress('Analyzing PRNU sensor noise...');
          const prnuResult = analyzePRNU(imageData, width, height);
          analyses.push(prnuResult);

          setProgress("Running Benford's Law analysis...");
          const benfordResult = analyzeBenfordsLaw(imageData, width, height);
          analyses.push(benfordResult);

          setProgress('Decoding GAN fingerprints...');
          const ganResult = decodeGANFingerprint(imageData, width, height);
          analyses.push(ganResult);

          setProgress('Detecting compression ghosts...');
          const ghostResult = await detectCompressionGhosts(imageData, width, height);
          analyses.push(ghostResult);

          setProgress('Generating confidence map...');
          const confMap = generateConfidenceMap(imageData, width, height);
          setConfidenceMap(confMap);
        }

        setProgress('Running threat intelligence...');
        const threatResult = await runThreatIntelligence(file, imageData, width, height, analyses);
        analyses.push(threatResult);

      } else if (scanMode === 'ela') {
        if (imageData) {
          setProgress('Running Error Level Analysis...');
          const elaResult = await performELA(imageData, width, height);
          analyses = [elaResult];
        } else {
          analyses = [{ name: 'Error Level Analysis', score: 0, findings: [{ severity: 'info', title: 'Image Required', detail: 'ELA requires an image file.' }], icon: 'FlaskConical' }];
        }
      } else if (scanMode === 'prnu') {
        if (imageData) {
          setProgress('Analyzing PRNU sensor noise...');
          const prnuResult = analyzePRNU(imageData, width, height);
          analyses = [prnuResult];
        } else {
          analyses = [{ name: 'PRNU Analysis', score: 0, findings: [{ severity: 'info', title: 'Image Required', detail: 'PRNU analysis requires an image file.' }], icon: 'Radio' }];
        }
      } else if (scanMode === 'benford') {
        if (imageData) {
          setProgress("Running Benford's Law analysis...");
          const benfordResult = analyzeBenfordsLaw(imageData, width, height);
          analyses = [benfordResult];
        } else {
          analyses = [{ name: "Benford's Law", score: 0, findings: [{ severity: 'info', title: 'Image Required', detail: "Benford's Law analysis requires an image." }], icon: 'BarChart3' }];
        }
      } else if (scanMode === 'gan') {
        if (imageData) {
          setProgress('Decoding GAN fingerprints...');
          const ganResult = decodeGANFingerprint(imageData, width, height);
          analyses = [ganResult];
        } else {
          analyses = [{ name: 'GAN Fingerprint', score: 0, findings: [{ severity: 'info', title: 'Image Required', detail: 'GAN fingerprint analysis requires an image.' }], icon: 'Fingerprint' }];
        }
      } else if (scanMode === 'ghost') {
        if (imageData) {
          setProgress('Detecting compression ghosts...');
          const ghostResult = await detectCompressionGhosts(imageData, width, height);
          analyses = [ghostResult];
        } else {
          analyses = [{ name: 'Compression Ghost', score: 0, findings: [{ severity: 'info', title: 'Image Required', detail: 'Compression ghost detection requires an image.' }], icon: 'Eye' }];
        }
      } else if (scanMode === 'threat') {
        setProgress('Running threat intelligence...');
        const threatResult = await runThreatIntelligence(file, imageData, width, height, []);
        analyses = [threatResult];
      } else {
        // Default: full scan
        setProgress('Running full analysis...');
        const metadataResult = await analyzeMetadata(file);
        analyses = [metadataResult];
      }

      // Calculate weighted overall score
      const totalScore = analyses.reduce((sum, a) => sum + a.score, 0);
      const overallScore = Math.min(Math.round(totalScore / analyses.length), 100);

      // Save to scan history
      if (user && onUpdateUser) {
        const scanEntry = {
          fileName: file.name,
          fileType: file.type,
          date: new Date().toISOString(),
          score: overallScore,
          mode: scanMode
        };
        const updatedUser = {
          ...user,
          scansToday: (user.scansToday || 0) + 1,
          totalScans: (user.totalScans || 0) + 1,
          scanHistory: [scanEntry, ...(user.scanHistory || [])].slice(0, 50)
        };
        onUpdateUser(updatedUser);
      }

      setResults({
        overallScore,
        analyses,
        crossModelScores,
        timelineData
      });
    } catch (err) {
      console.error('Analysis error:', err);
      setResults({
        overallScore: 0,
        analyses: [{
          name: 'Error',
          score: 0,
          findings: [{ severity: 'critical', title: 'Analysis Failed', detail: err.message }],
          icon: 'Shield'
        }],
        crossModelScores: {},
        timelineData: null
      });
    } finally {
      setIsAnalyzing(false);
      setProgress('');
    }
  }, [scanMode, user, onUpdateUser]);

  const handleReset = useCallback(() => {
    setResults(null);
    setConfidenceMap(null);
    setImageUrl(null);
    setUploadedFile(null);
    setImageDimensions({ width: 0, height: 0 });
  }, []);

  const getModeTitle = () => {
    const titles = {
      scan: 'Full Forensic Scan',
      ela: 'Error Level Analysis',
      prnu: 'PRNU Sensor Analysis',
      benford: "Benford's Law Analysis",
      gan: 'GAN Fingerprint Decoder',
      ghost: 'Compression Ghost Detection',
      batch: 'Batch Analysis',
      threat: 'Threat Intelligence'
    };
    return titles[scanMode] || 'Forensic Scan';
  };

  return (
    <div className="scan-page">
      <div className="bg-gradient" />
      <div className="bg-grid" />

      <header className="scan-header">
        <div className="scan-header-inner">
          <button className="back-btn" onClick={onBack} id="back-to-dashboard">
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <div className="scan-title-group">
            <Shield size={20} className="scan-title-icon" />
            <h2>{getModeTitle()}</h2>
          </div>
        </div>
      </header>

      <main className="app-main">
        <AnimatePresence mode="wait">
          {!results ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FileUpload
                onFileSelect={handleFileSelect}
                isAnalyzing={isAnalyzing}
              />
              {isAnalyzing && progress && (
                <motion.div
                  className="progress-status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="progress-bar">
                    <div className="progress-bar-fill" />
                  </div>
                  <span>{progress}</span>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <ResultsDashboard
                results={results}
                confidenceMap={confidenceMap}
                imageUrl={imageUrl}
                onReset={handleReset}
                file={uploadedFile}
                user={user}
                imageWidth={imageDimensions.width}
                imageHeight={imageDimensions.height}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
