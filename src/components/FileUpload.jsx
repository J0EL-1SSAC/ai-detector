import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, Music, Video, FileWarning, Link, Loader, AlertCircle } from 'lucide-react';

const ACCEPTED_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.svg'],
  'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'],
  'video/*': ['.mp4', '.webm', '.avi', '.mov', '.mkv', '.flv']
};

function getFileIcon(type) {
  if (type?.startsWith('image/')) return <Image size={48} />;
  if (type?.startsWith('audio/')) return <Music size={48} />;
  if (type?.startsWith('video/')) return <Video size={48} />;
  return <FileWarning size={48} />;
}

function getFileCategory(type) {
  if (type?.startsWith('image/')) return 'Image';
  if (type?.startsWith('audio/')) return 'Audio';
  if (type?.startsWith('video/')) return 'Video';
  return 'File';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function extractFileName(url) {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').pop();
    return name || 'image_from_url.png';
  } catch {
    return 'image_from_url.png';
  }
}

export default function FileUpload({ onFileSelect, isAnalyzing }) {
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: false,
    disabled: isAnalyzing
  });

  const file = acceptedFiles[0];

  const handleUrlSubmit = useCallback(async () => {
    const url = urlInput.trim();
    if (!url) return;

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      setUrlError('Please enter a valid URL');
      return;
    }

    setUrlLoading(true);
    setUrlError('');

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch (${response.status})`);
      }

      const blob = await response.blob();
      const contentType = blob.type || 'image/png';

      // Convert blob to File
      const fileName = extractFileName(url);
      const fetchedFile = new File([blob], fileName, { type: contentType });

      onFileSelect(fetchedFile);
    } catch (err) {
      // If direct fetch fails (CORS), try via proxy approach — load as image
      try {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Could not load image from URL. The server may block cross-origin requests.'));
          img.src = url;
        });

        // Draw to canvas and extract as blob
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        const fileName = extractFileName(url);
        const fetchedFile = new File([blob], fileName, { type: 'image/png' });

        onFileSelect(fetchedFile);
      } catch (fallbackErr) {
        setUrlError(fallbackErr.message || 'Failed to load media from URL. Try downloading it first.');
      }
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, onFileSelect]);

  const handleUrlKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !urlLoading && !isAnalyzing) {
      handleUrlSubmit();
    }
  }, [handleUrlSubmit, urlLoading, isAnalyzing]);

  return (
    <motion.div
      className="upload-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'dropzone--active' : ''} ${isAnalyzing ? 'dropzone--disabled' : ''}`}
        id="file-dropzone"
      >
        <input {...getInputProps()} id="file-input" />

        <AnimatePresence mode="wait">
          {isDragActive ? (
            <motion.div
              key="dragging"
              className="dropzone-content"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Upload size={64} className="upload-icon pulse" />
              <p className="dropzone-title">Drop it right here!</p>
            </motion.div>
          ) : isAnalyzing ? (
            <motion.div
              key="analyzing"
              className="dropzone-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="analyzing-spinner" />
              <p className="dropzone-title">Analyzing...</p>
              <p className="dropzone-subtitle">Running forensic analysis on your file</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              className="dropzone-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Upload size={48} className="upload-icon" />
              <p className="dropzone-title">
                Drag & drop your file here
              </p>
              <p className="dropzone-subtitle">
                or click to browse
              </p>
              <div className="supported-types">
                <span className="type-badge"><Image size={14} /> Images</span>
                <span className="type-badge"><Music size={14} /> Audio</span>
                <span className="type-badge"><Video size={14} /> Video</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* URL Input Section */}
      <motion.div
        className="url-upload-section"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="url-divider">
          <span className="url-divider-line" />
          <span className="url-divider-text">OR</span>
          <span className="url-divider-line" />
        </div>

        <div className="url-input-group">
          <div className="url-input-wrapper">
            <Link size={18} className="url-input-icon" />
            <input
              type="url"
              className="url-input"
              placeholder="Paste image URL here..."
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
              onKeyDown={handleUrlKeyDown}
              disabled={isAnalyzing || urlLoading}
              id="url-input"
            />
          </div>
          <button
            className="url-submit-btn"
            onClick={handleUrlSubmit}
            disabled={!urlInput.trim() || isAnalyzing || urlLoading}
            id="url-submit-btn"
          >
            {urlLoading ? (
              <>
                <Loader size={16} className="btn-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Image size={16} />
                Analyze URL
              </>
            )}
          </button>
        </div>

        {urlError && (
          <motion.div
            className="url-error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle size={14} />
            <span>{urlError}</span>
          </motion.div>
        )}
      </motion.div>

      {file && !isAnalyzing && (
        <motion.div
          className="file-preview"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <div className="file-preview-icon">
            {getFileIcon(file.type)}
          </div>
          <div className="file-preview-info">
            <span className="file-name">{file.name}</span>
            <span className="file-meta">
              {getFileCategory(file.type)} • {formatFileSize(file.size)}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
