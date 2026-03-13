import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image, Music, Video, FileWarning } from 'lucide-react';

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

export default function FileUpload({ onFileSelect, isAnalyzing }) {
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
