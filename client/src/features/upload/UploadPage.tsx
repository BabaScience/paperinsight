import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudUpload,
  Description,
  CheckCircle,
  Close,
  AutoAwesome,
} from '@mui/icons-material';
import { LinearProgress, CircularProgress } from '@mui/material';
import toast from 'react-hot-toast';
import { papersApi } from '@/lib/api';
import { usePaperStore } from '@/stores/paperStore';
import {
  connectSocket,
  subscribeToPaper,
  onProcessingStatus,
  onProcessingComplete,
} from '@/lib/socket';

interface UploadedFile {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  paperId?: string;
  message?: string;
}

export function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const navigate = useNavigate();
  const { addPaper } = usePaperStore();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      if (file.type !== 'application/pdf') {
        toast.error(`${file.name} is not a PDF file`);
        continue;
      }

      // Add file to upload list
      setUploadedFiles((prev) => [
        ...prev,
        { file, progress: 0, status: 'uploading' },
      ]);

      try {
        // Upload file
        const response = await papersApi.upload(file, (progress) => {
          setUploadedFiles((prev) =>
            prev.map((f) =>
              f.file === file ? { ...f, progress } : f
            )
          );
        });

        const paper = response.data.data.paper;

        // Update file status
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: 'processing', paperId: paper.id, message: 'Processing...' }
              : f
          )
        );

        // Subscribe to processing updates
        connectSocket();
        subscribeToPaper(paper.id);

        addPaper({
          ...paper,
          _id: paper.id,
        });

        toast.success(`${file.name} uploaded successfully`);
      } catch (error: any) {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: 'error', message: error.message || 'Upload failed' }
              : f
          )
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  }, [addPaper]);

  // Listen for processing updates
  useEffect(() => {
    const unsubStatus = onProcessingStatus((data) => {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.paperId === data.paperId
            ? { ...f, message: data.message }
            : f
        )
      );
    });

    const unsubComplete = onProcessingComplete((data) => {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.paperId === data.paperId
            ? { ...f, status: 'ready', message: 'Ready for analysis!' }
            : f
        )
      );
    });

    return () => {
      unsubStatus();
      unsubComplete();
    };
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    multiple: true,
  });

  const removeFile = (file: File) => {
    setUploadedFiles((prev) => prev.filter((f) => f.file !== file));
  };

  const viewPaper = (paperId: string) => {
    navigate(`/paper/${paperId}`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-theme-primary">
          Upload Papers
        </h1>
        <p className="text-theme-muted mt-1">
          Add research papers to analyze with AI-powered insights
        </p>
      </div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
            ${
              isDragActive
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-theme-border hover:border-primary-500/50 hover:bg-theme-surface-hover/50'
            }`}
        >
          <input {...getInputProps()} />
          
          <motion.div
            animate={{ scale: isDragActive ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
            className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-violet/20 flex items-center justify-center"
          >
            <CloudUpload
              className={`text-4xl ${isDragActive ? 'text-primary-400' : 'text-theme-muted'}`}
            />
          </motion.div>

          <h3 className="text-xl font-semibold text-theme-primary mb-2">
            {isDragActive ? 'Drop your papers here' : 'Drag & drop papers here'}
          </h3>
          <p className="text-theme-muted mb-4">
            or click to browse your files
          </p>
          <p className="text-sm text-theme-muted">
            Supports PDF files up to 50MB
          </p>

          {/* Decorative background */}
          <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent-violet/5 rounded-full blur-3xl" />
          </div>
        </div>
      </motion.div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-semibold text-theme-primary">
              Uploaded Papers
            </h3>
            
            {uploadedFiles.map((uploadedFile, index) => (
              <motion.div
                key={uploadedFile.file.name + index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-violet/20 flex items-center justify-center flex-shrink-0">
                    <Description className="text-primary-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-theme-primary truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-sm text-theme-muted">
                      {(uploadedFile.file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {uploadedFile.status === 'uploading' && (
                      <div className="w-32">
                        <LinearProgress
                          variant="determinate"
                          value={uploadedFile.progress}
                          className="rounded-full"
                        />
                        <p className="text-xs text-theme-muted mt-1 text-center">
                          {uploadedFile.progress}%
                        </p>
                      </div>
                    )}

                    {uploadedFile.status === 'processing' && (
                      <div className="flex items-center gap-2 text-primary-400">
                        <CircularProgress size={20} color="inherit" />
                        <span className="text-sm">{uploadedFile.message}</span>
                      </div>
                    )}

                    {uploadedFile.status === 'ready' && (
                      <button
                        onClick={() => uploadedFile.paperId && viewPaper(uploadedFile.paperId)}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-mint/10 text-accent-mint rounded-lg hover:bg-accent-mint/20 transition-colors"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">View</span>
                      </button>
                    )}

                    {uploadedFile.status === 'error' && (
                      <span className="text-sm text-accent-coral">
                        {uploadedFile.message}
                      </span>
                    )}

                    <button
                      onClick={() => removeFile(uploadedFile.file)}
                      className="p-2 hover:bg-theme-surface-hover rounded-lg transition-colors"
                    >
                      <Close className="w-5 h-5 text-theme-muted" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      <div className="card bg-primary-500/5 border-primary-500/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
            <AutoAwesome className="text-primary-400" />
          </div>
          <div>
            <h4 className="font-semibold text-theme-primary mb-2">
              Tips for best results
            </h4>
            <ul className="text-sm text-theme-muted space-y-1.5">
              <li>• Upload academic papers in PDF format</li>
              <li>• Ensure the PDF contains searchable text (not scanned images)</li>
              <li>• Papers with clear section headers work best for analysis</li>
              <li>• Processing typically takes 30-60 seconds depending on length</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
