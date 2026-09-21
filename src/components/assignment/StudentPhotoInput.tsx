import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  FolderOpen, 
  Upload, 
  X, 
  RotateCw, 
  Check, 
  Eye, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  FileImage,
  Sparkles,
  Smartphone
} from 'lucide-react';

interface StudentPhotoInputProps {
  id?: string;
  file?: File;
  previewUrl?: string;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
  onZoomPreview?: (url: string) => void;
  compact?: boolean;
}

export const StudentPhotoInput: React.FC<StudentPhotoInputProps> = ({
  id,
  file,
  previewUrl,
  onSelectFile,
  onRemove,
  onZoomPreview,
  compact = false
}) => {
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [dragActive, setDragActive] = useState(false);

  // Hidden inputs for file browsing and native camera
  const filePickerRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Video & Canvas references for live in-app camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up media stream when camera modal closes
  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (capturedBlobUrl && capturedBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(capturedBlobUrl);
      }
    };
  }, [capturedBlobUrl]);

  // Start live camera stream
  const startCameraStream = async (mode: 'environment' | 'user') => {
    stopMediaTracks();
    setCameraLoading(true);
    setCameraError(null);
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    setRotation(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('In-browser camera is not supported by your browser. Please use your device camera app or choose from files.');
      }

      // Try with requested facing mode, fallback to any video
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch {
        // Fallback without specific constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraLoading(false);
    } catch (err: any) {
      console.warn('Live camera stream error:', err);
      setCameraLoading(false);
      let errorMsg = 'Unable to access live camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. You can allow camera in browser settings, or use your device camera app below.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device found on this system. You can choose from files instead.';
      }
      setCameraError(errorMsg);
    }
  };

  // Open camera modal
  const handleOpenLiveCamera = () => {
    setIsCameraModalOpen(true);
    startCameraStream(facingMode);
  };

  // Close camera modal
  const handleCloseLiveCamera = () => {
    stopMediaTracks();
    setIsCameraModalOpen(false);
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    setCameraError(null);
  };

  // Toggle between front and rear cameras
  const handleFlipCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCameraStream(newMode);
  };

  // Snap photo from live video canvas
  const handleSnapPhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, width, height);

    // Convert to Blob
    canvas.toBlob((blob) => {
      if (!blob) return;
      const fileExt = 'jpg';
      const fileName = `homework_photo_${Date.now()}.${fileExt}`;
      const snappedFile = new File([blob], fileName, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      setCapturedFile(snappedFile);
      setCapturedBlobUrl(url);
      stopMediaTracks();
    }, 'image/jpeg', 0.92);
  };

  // Rotate captured photo in preview
  const handleRotateCaptured = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Confirm and apply snapped photo
  const handleConfirmCapturedPhoto = () => {
    if (!capturedFile) return;

    if (rotation === 0) {
      onSelectFile(capturedFile);
      handleCloseLiveCamera();
      return;
    }

    // Apply rotation if needed
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const is90or270 = rotation === 90 || rotation === 270;
      canvas.width = is90or270 ? img.height : img.width;
      canvas.height = is90or270 ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onSelectFile(capturedFile);
        handleCloseLiveCamera();
        return;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob((rotatedBlob) => {
        if (!rotatedBlob) {
          onSelectFile(capturedFile);
        } else {
          const finalFile = new File([rotatedBlob], capturedFile.name, { type: 'image/jpeg' });
          onSelectFile(finalFile);
        }
        handleCloseLiveCamera();
      }, 'image/jpeg', 0.92);
    };
    img.src = capturedBlobUrl!;
  };

  // Trigger system file picker (Get from Files)
  const handleTriggerFilePicker = () => {
    filePickerRef.current?.click();
  };

  // Trigger native camera directly (e.g. mobile camera app)
  const handleTriggerNativeCamera = () => {
    nativeCameraInputRef.current?.click();
  };

  // Handle native file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    onSelectFile(selected);
    // reset input so the same file can be re-selected if needed
    e.target.value = '';
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/') || droppedFile.name.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i)) {
        onSelectFile(droppedFile);
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full space-y-2.5" id={id || 'student-photo-uploader'}>
      {/* Hidden File Inputs */}
      <input
        ref={filePickerRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ──────────────── ALREADY ATTACHED STATE ──────────────── */}
      {(file || previewUrl) ? (
        <div className="p-3.5 bg-emerald-500/5 border-2 border-emerald-500/25 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
            {previewUrl ? (
              <div 
                className="relative group w-16 h-16 rounded-xl overflow-hidden border border-emerald-500/40 bg-brand-bg shrink-0 cursor-pointer shadow-xs"
                onClick={() => onZoomPreview?.(previewUrl)}
                title="Click to zoom image"
              >
                <img
                  src={previewUrl}
                  alt="Work thumbnail"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Eye size={16} />
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shrink-0">
                <FileImage size={24} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                  Photo Attached ✓
                </span>
              </div>
              <p className="text-xs font-bold text-brand-text truncate mt-0.5">
                {file?.name || 'Handwritten Work Photo'}
              </p>
              <p className="text-[10px] text-brand-muted font-medium">
                {formatFileSize(file?.size) || 'Ready for submission'}
              </p>
            </div>
          </div>

          {/* Action buttons: Replace or Remove */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-500/20">
            {previewUrl && (
              <button
                type="button"
                onClick={() => onZoomPreview?.(previewUrl)}
                className="px-2.5 py-1.5 rounded-xl border border-brand-border bg-brand-surface text-xs font-bold text-brand-text hover:bg-brand-bg flex items-center gap-1.5 transition-colors"
                title="Full Preview"
              >
                <Eye size={13} />
                <span className="hidden sm:inline">Preview</span>
              </button>
            )}

            {/* Change Photo Dropdown / Action options */}
            <div className="flex items-center gap-1 bg-brand-bg/80 p-1 rounded-xl border border-brand-border/70">
              <button
                type="button"
                onClick={handleOpenLiveCamera}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-brand-muted hover:text-brand-accent hover:bg-brand-surface flex items-center gap-1 transition-colors"
                title="Retake with Camera"
              >
                <Camera size={12} />
                <span>Retake</span>
              </button>
              <span className="text-brand-border">|</span>
              <button
                type="button"
                onClick={handleTriggerFilePicker}
                className="px-2 py-1 rounded-lg text-[11px] font-bold text-brand-muted hover:text-brand-accent hover:bg-brand-surface flex items-center gap-1 transition-colors"
                title="Choose from Files"
              >
                <FolderOpen size={12} />
                <span>Change File</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onRemove}
              className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors shrink-0"
              title="Remove photo"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* ──────────────── EMPTY / SELECT OPTION STATE ──────────────── */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl transition-all ${
            dragActive
              ? 'border-brand-accent bg-brand-accent/10 scale-[0.99]'
              : 'border-brand-border hover:border-brand-accent/40 bg-brand-bg/40'
          } ${compact ? 'p-3' : 'p-4 sm:p-5'}`}
        >
          {/* Header prompt */}
          <div className="text-center mb-3">
            <p className="text-xs font-bold text-brand-text">
              How would you like to add your photo?
            </p>
            <p className="text-[10px] text-brand-muted mt-0.5">
              Snap your written calculations and notes directly or select a saved file
            </p>
          </div>

          {/* TWO CLEAR OPTIONS: TAKE PHOTO vs GET FROM FILES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* OPTION 1: TAKE A PHOTO */}
            <button
              type="button"
              onClick={handleOpenLiveCamera}
              className="group relative p-3.5 sm:p-4 rounded-xl border-2 border-brand-accent/20 bg-brand-surface hover:bg-brand-accent/5 hover:border-brand-accent transition-all flex items-center sm:flex-col sm:text-center gap-3 text-left active:scale-[0.98] shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-accent/10 text-brand-accent group-hover:bg-brand-accent group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                <Camera size={22} />
              </div>
              <div className="min-w-0 flex-1 sm:flex-initial">
                <div className="flex items-center gap-1.5 sm:justify-center">
                  <span className="font-black text-xs text-brand-text group-hover:text-brand-accent transition-colors">
                    Take a Photo
                  </span>
                  <span className="text-[9px] font-bold text-brand-accent bg-brand-accent/10 px-1.5 py-0.2 rounded-md">
                    Camera
                  </span>
                </div>
                <p className="text-[10px] text-brand-muted mt-0.5">
                  Snap live with camera or webcam
                </p>
              </div>
            </button>

            {/* OPTION 2: GET FROM FILES */}
            <button
              type="button"
              onClick={handleTriggerFilePicker}
              className="group relative p-3.5 sm:p-4 rounded-xl border-2 border-brand-border bg-brand-surface hover:bg-brand-accent/5 hover:border-brand-accent/50 transition-all flex items-center sm:flex-col sm:text-center gap-3 text-left active:scale-[0.98] shadow-xs"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-bg text-brand-muted group-hover:bg-brand-accent group-hover:text-white flex items-center justify-center transition-colors shrink-0 border border-brand-border group-hover:border-brand-accent">
                <FolderOpen size={22} />
              </div>
              <div className="min-w-0 flex-1 sm:flex-initial">
                <div className="flex items-center gap-1.5 sm:justify-center">
                  <span className="font-black text-xs text-brand-text group-hover:text-brand-accent transition-colors">
                    Get from Files
                  </span>
                  <span className="text-[9px] font-bold text-brand-muted bg-brand-bg px-1.5 py-0.2 rounded-md border border-brand-border/60">
                    Gallery / Disk
                  </span>
                </div>
                <p className="text-[10px] text-brand-muted mt-0.5">
                  Choose from images, gallery, or PDF
                </p>
              </div>
            </button>
          </div>

          {/* Drag & Drop or Native Camera Quick-Link */}
          <div className="mt-3 pt-2.5 border-t border-brand-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] text-brand-muted font-medium">
            <div className="flex items-center gap-1.5">
              <Upload size={12} className="text-brand-accent" />
              <span>Or drag & drop an image here</span>
            </div>
            <button
              type="button"
              onClick={handleTriggerNativeCamera}
              className="text-brand-accent hover:underline font-bold flex items-center gap-1 ml-auto"
              title="Direct native camera"
            >
              <Smartphone size={11} />
              <span>Use mobile camera app</span>
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── LIVE CAMERA MODAL ──────────────── */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-brand-surface border border-brand-border rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-bg/90">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-accent/15 text-brand-accent flex items-center justify-center">
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-brand-text leading-tight">
                    {capturedBlobUrl ? 'Review Your Photo' : 'Take a Photo'}
                  </h3>
                  <p className="text-[10px] text-brand-muted">
                    {capturedBlobUrl ? 'Make sure your handwritten work is readable' : 'Point camera at your homework or notes'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {!capturedBlobUrl && !cameraError && (
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="p-2 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-accent transition-all"
                    title="Flip camera (Front / Rear)"
                  >
                    <RefreshCw size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseLiveCamera}
                  className="p-2 rounded-xl bg-brand-bg border border-brand-border text-brand-muted hover:text-brand-text transition-all"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="relative bg-black flex-1 min-h-[300px] max-h-[58vh] flex items-center justify-center overflow-hidden">
              {/* If previewing snapped photo */}
              {capturedBlobUrl ? (
                <div className="relative w-full h-full flex items-center justify-center p-2">
                  <img
                    src={capturedBlobUrl}
                    alt="Captured snapshot"
                    style={{ transform: `rotate(${rotation}deg)` }}
                    className="max-h-[52vh] max-w-full object-contain rounded-xl shadow-lg transition-transform duration-200"
                  />
                  {/* Rotation button */}
                  <button
                    type="button"
                    onClick={handleRotateCaptured}
                    className="absolute bottom-4 right-4 bg-black/70 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition-all border border-white/20"
                    title="Rotate 90 degrees"
                  >
                    <RotateCw size={14} />
                    <span>Rotate</span>
                  </button>
                </div>
              ) : cameraError ? (
                /* Camera Error View with fallbacks */
                <div className="p-6 text-center space-y-4 max-w-sm">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{cameraError}</p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseLiveCamera();
                        handleTriggerNativeCamera();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-brand-accent text-white font-bold text-xs flex items-center justify-center gap-2 hover:brightness-105 transition-all shadow-md"
                    >
                      <Smartphone size={15} />
                      <span>Use Device Camera App</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseLiveCamera();
                        handleTriggerFilePicker();
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <FolderOpen size={15} />
                      <span>Get from Files Instead</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Live Viewfinder */
                <div className="relative w-full h-full flex items-center justify-center">
                  {cameraLoading && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white gap-2 z-10">
                      <Loader2 size={28} className="animate-spin text-brand-accent" />
                      <span className="text-xs font-bold">Starting camera…</span>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Framing Guide Lines for paper/homework */}
                  <div className="absolute inset-5 border-2 border-white/30 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-brand-accent" />
                      <div className="w-4 h-4 border-t-2 border-r-2 border-brand-accent" />
                    </div>
                    <p className="text-center text-[10px] font-bold text-white/80 bg-black/40 py-1 px-3 rounded-full mx-auto backdrop-blur-xs">
                      Align your handwritten work inside this frame
                    </p>
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-b-2 border-l-2 border-brand-accent" />
                      <div className="w-4 h-4 border-b-2 border-r-2 border-brand-accent" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Controls Footer */}
            <div className="px-4 py-3.5 border-t border-brand-border bg-brand-surface flex items-center justify-between gap-3">
              {capturedBlobUrl ? (
                <>
                  <button
                    type="button"
                    onClick={() => startCameraStream(facingMode)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-brand-border bg-brand-bg text-brand-text font-bold text-xs hover:bg-brand-surface flex items-center justify-center gap-1.5 transition-all"
                  >
                    <RefreshCw size={14} />
                    <span>Retake Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCapturedPhoto}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <Check size={16} />
                    <span>Use This Photo</span>
                  </button>
                </>
              ) : !cameraError ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      handleCloseLiveCamera();
                      handleTriggerFilePicker();
                    }}
                    className="text-xs font-bold text-brand-muted hover:text-brand-text flex items-center gap-1.5 px-2 py-1"
                  >
                    <FolderOpen size={14} />
                    <span className="hidden sm:inline">Get from Files</span>
                  </button>

                  {/* Center Shutter Button */}
                  <button
                    type="button"
                    disabled={cameraLoading}
                    onClick={handleSnapPhoto}
                    className="w-14 h-14 rounded-full bg-brand-accent hover:brightness-110 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-brand-accent/30 transition-all mx-auto border-4 border-white/20"
                    title="Snap photo"
                  >
                    <Camera size={24} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleCloseLiveCamera();
                      handleTriggerNativeCamera();
                    }}
                    className="text-xs font-bold text-brand-accent hover:underline flex items-center gap-1.5 px-2 py-1"
                    title="Open device camera directly"
                  >
                    <Smartphone size={14} />
                    <span className="hidden sm:inline">Device App</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseLiveCamera}
                  className="w-full py-2.5 rounded-xl border border-brand-border bg-brand-bg text-brand-text font-bold text-xs"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
