"use client";

import { RecordingSettings } from "./types";
import { GoogleDriveUploader } from "./google-drive-utils";

// Add mobile detection utility at the top of the file
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 2) && /MacIntel/.test(navigator.platform));
}

/**
 * Get user media streams based on selected settings
 */
export async function getMediaStreams(settings: RecordingSettings): Promise<{
  cameraStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioStream: MediaStream | null;
}> {
  let cameraStream: MediaStream | null = null;
  let screenStream: MediaStream | null = null;
  let audioStream: MediaStream | null = null;

  try {
    // Get camera stream if enabled with lower resolution
    if (settings.cameraEnabled) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: "user",
          frameRate: { max: 30 }
        },
        audio: false
      });
    }

    // Get audio stream if microphone is enabled
    if (settings.microphoneEnabled) {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        },
        video: false
      });
    }

    // Get screen stream if enabled with optimized settings (disabled on mobile)
    if (settings.screenShareEnabled && !isMobileDevice()) {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { max: 10 },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
    }

    return { cameraStream, screenStream, audioStream };
  } catch (error) {
    console.error("Error accessing media devices:", error);
    return { cameraStream, screenStream, audioStream };
  }
}

/**
 * Create a combined stream with screen sharing and PIP camera
 * This version supports dynamic updates without recreating the stream
 */
export function createCombinedStream(
  screenStream: MediaStream | null,
  cameraStream: MediaStream | null,
  audioStream: MediaStream | null
): MediaStream | null {
  console.log("createCombinedStream called with:", {
    screenStream: !!screenStream,
    cameraStream: !!cameraStream,
    audioStream: !!audioStream
  });

  // If no video sources are enabled, return audio-only stream
  if (!screenStream && !cameraStream) {
    console.log("No video sources, returning audio stream");
    return audioStream;
  }

  // Set canvas dimensions based on device type
  const isMobile = isMobileDevice();
  const CANVAS_WIDTH = isMobile ? 720 : 1280;
  const CANVAS_HEIGHT = isMobile ? 1280 : 720; // Portrait for mobile, landscape for desktop

  // Create a canvas element with responsive size
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true,
    willReadFrequently: false
  });

  if (!ctx) return null;

  // Create stream from canvas with appropriate frame rate
  const canvasStream = canvas.captureStream(isMobile ? 10 : 15);

  // Create video elements for the streams
  const screenVideo = document.createElement("video");
  screenVideo.autoplay = true;
  screenVideo.muted = true;
  screenVideo.playsInline = true;

  const cameraVideo = document.createElement("video");
  cameraVideo.autoplay = true;
  cameraVideo.muted = true;
  cameraVideo.playsInline = true;

  // Store current streams for dynamic updates
  let currentScreenStream = screenStream;
  let currentCameraStream = cameraStream;
  let currentAudioStream = audioStream;

  // Simplified audio handling - use Web Audio API for stable recording
  let audioContext: AudioContext | null = null;
  let gainNode: GainNode | null = null;
  let destinationNode: MediaStreamAudioDestinationNode | null = null;
  let micSourceNode: MediaStreamAudioSourceNode | null = null;
  let silentSourceNode: OscillatorNode | null = null;
  let isMicEnabled = false;

  // Initialize audio system
  const initializeAudio = () => {
    try {
      audioContext = new AudioContext();
      gainNode = audioContext.createGain();
      destinationNode = audioContext.createMediaStreamDestination();

      // Create a silent oscillator to maintain audio track continuity
      silentSourceNode = audioContext.createOscillator();
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0.001; // Very quiet but not completely silent

      silentSourceNode.connect(silentGain);
      silentGain.connect(destinationNode);
      silentSourceNode.start();

      // Connect gain node to destination
      gainNode.connect(destinationNode);

      // Add the stable audio track to canvas stream
      if (destinationNode.stream.getAudioTracks().length > 0) {
        destinationNode.stream.getAudioTracks().forEach(track => {
          canvasStream.addTrack(track);
        });
      }

      // Set initial state and connect microphone if available
      isMicEnabled = audioStream !== null && audioStream.getAudioTracks().length > 0;

      if (audioStream && audioStream.getAudioTracks().length > 0) {
        micSourceNode = audioContext.createMediaStreamSource(audioStream);
        micSourceNode.connect(gainNode);
        gainNode.gain.value = isMicEnabled ? 1 : 0;
        console.log("Audio initialized - mic enabled:", isMicEnabled);
      } else {
        gainNode.gain.value = 0;
        console.log("Audio initialized - no microphone");
      }

    } catch (error) {
      console.warn("Could not initialize audio context:", error);
    }
  };

  // Function to update streams dynamically
  const updateStreams = (newScreenStream: MediaStream | null, newCameraStream: MediaStream | null, newAudioStream: MediaStream | null) => {
    console.log("updateStreams called with:", {
      newScreenStream: !!newScreenStream,
      newCameraStream: !!newCameraStream,
      newAudioStream: !!newAudioStream
    });

    // Update screen stream
    if (newScreenStream !== currentScreenStream) {
      if (newScreenStream) {
        screenVideo.srcObject = newScreenStream;
        screenVideo.play().catch(console.warn);
      } else {
        screenVideo.srcObject = null;
      }
      currentScreenStream = newScreenStream;
    }

    // Update camera stream
    if (newCameraStream !== currentCameraStream) {
      if (newCameraStream) {
        cameraVideo.srcObject = newCameraStream;
        cameraVideo.play().catch(console.warn);
      } else {
        cameraVideo.srcObject = null;
      }
      currentCameraStream = newCameraStream;
    } else if (newCameraStream && !cameraVideo.srcObject) {
      // Handle case where stream is the same but video element needs setup
      cameraVideo.srcObject = newCameraStream;
      cameraVideo.play().catch(console.warn);
    }

    // Handle audio stream changes
    const newMicEnabled = newAudioStream !== null && newAudioStream.getAudioTracks().length > 0;

    // If audio stream changed, reconnect the source
    if (newAudioStream !== currentAudioStream && audioContext && gainNode) {
      // Disconnect old source
      if (micSourceNode) {
        micSourceNode.disconnect();
        micSourceNode = null;
      }

      // Connect new source if available
      if (newAudioStream && newAudioStream.getAudioTracks().length > 0) {
        try {
          micSourceNode = audioContext.createMediaStreamSource(newAudioStream);
          micSourceNode.connect(gainNode);
          console.log("Connected new audio stream");
        } catch (error) {
          console.warn("Could not connect new audio stream:", error);
        }
      }

      currentAudioStream = newAudioStream;
    }

    // Handle mic enable/disable
    if (newMicEnabled !== isMicEnabled && gainNode && audioContext) {
      if (newMicEnabled) {
        // Smoothly unmute
        gainNode.gain.setTargetAtTime(1, audioContext.currentTime, 0.1);
        console.log("Microphone unmuted");
      } else {
        // Smoothly mute
        gainNode.gain.setTargetAtTime(0, audioContext.currentTime, 0.1);
        console.log("Microphone muted");
      }
      isMicEnabled = newMicEnabled;
    }
  };

  // Initial setup
  if (screenStream) {
    screenVideo.srcObject = screenStream;
    screenVideo.play().catch(console.warn);
  }

  if (cameraStream) {
    cameraVideo.srcObject = cameraStream;
    cameraVideo.play().catch(console.warn);
  }

  // Initialize audio system
  initializeAudio();

  console.log("Initial streams setup completed");

  // Camera PIP settings - adjust for mobile
  const PIP_DIAMETER = Math.min(isMobile ? 120 : 180, CANVAS_WIDTH * 0.15);
  let pipX = CANVAS_WIDTH - PIP_DIAMETER - 20;
  let pipY = CANVAS_HEIGHT - PIP_DIAMETER - 20;
  let isDragging = false;

  // Add event listeners for PIP dragging
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

    const centerX = pipX + PIP_DIAMETER / 2;
    const centerY = pipY + PIP_DIAMETER / 2;
    const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

    if (distance <= PIP_DIAMETER / 2) {
      isDragging = true;
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    if (isDragging) {
      const rect = canvas.getBoundingClientRect();
      pipX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width) - PIP_DIAMETER / 2;
      pipY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height) - PIP_DIAMETER / 2;

      pipX = Math.max(0, Math.min(CANVAS_WIDTH - PIP_DIAMETER, pipX));
      pipY = Math.max(0, Math.min(CANVAS_HEIGHT - PIP_DIAMETER, pipY));
    }
  });

  canvas.addEventListener("mouseup", () => {
    isDragging = false;
  });

  let animationFrameId: number;
  let lastDrawTime = 0;
  const FRAME_INTERVAL = 1000 / 30;

  function drawStreams(timestamp: number) {
    if (!ctx) return;

    if (timestamp - lastDrawTime < FRAME_INTERVAL) {
      animationFrameId = requestAnimationFrame(drawStreams);
      return;
    }

    lastDrawTime = timestamp;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw screen share or camera as main view
    if (currentScreenStream && screenVideo.readyState >= 2) {
      const screenAspect = screenVideo.videoWidth / screenVideo.videoHeight;
      let drawWidth = CANVAS_WIDTH;
      let drawHeight = CANVAS_WIDTH / screenAspect;

      if (drawHeight > CANVAS_HEIGHT) {
        drawHeight = CANVAS_HEIGHT;
        drawWidth = CANVAS_HEIGHT * screenAspect;
      }

      const x = (CANVAS_WIDTH - drawWidth) / 2;
      const y = (CANVAS_HEIGHT - drawHeight) / 2;

      ctx.drawImage(screenVideo, x, y, drawWidth, drawHeight);

      // Draw camera PIP if available
      if (currentCameraStream && cameraVideo.readyState >= 2) {
        ctx.save();
        ctx.beginPath();
        const centerX = pipX + PIP_DIAMETER / 2;
        const centerY = pipY + PIP_DIAMETER / 2;
        ctx.arc(centerX, centerY, PIP_DIAMETER / 2, 0, Math.PI * 2);
        ctx.clip();

        const cameraAspect = cameraVideo.videoWidth / cameraVideo.videoHeight;
        let pipDrawWidth = PIP_DIAMETER;
        let pipDrawHeight = PIP_DIAMETER;

        if (cameraAspect > 1) {
          pipDrawHeight = PIP_DIAMETER;
          pipDrawWidth = pipDrawHeight * cameraAspect;
        } else {
          pipDrawWidth = PIP_DIAMETER;
          pipDrawHeight = pipDrawWidth / cameraAspect;
        }

        const pipOffsetX = pipX + (PIP_DIAMETER - pipDrawWidth) / 2;
        const pipOffsetY = pipY + (PIP_DIAMETER - pipDrawHeight) / 2;

        ctx.drawImage(cameraVideo, pipOffsetX, pipOffsetY, pipDrawWidth, pipDrawHeight);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, PIP_DIAMETER / 2, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    } else if (currentCameraStream && cameraVideo.readyState >= 2) {
      // For mobile, optimize camera-only view
      const cameraAspect = cameraVideo.videoWidth / cameraVideo.videoHeight;

      let drawWidth, drawHeight;

      if (isMobile) {
        // On mobile, fill the portrait canvas optimally
        if (cameraAspect > CANVAS_WIDTH / CANVAS_HEIGHT) {
          // Camera is wider than canvas aspect - fit to height
          drawHeight = CANVAS_HEIGHT;
          drawWidth = drawHeight * cameraAspect;
        } else {
          // Camera is taller than canvas aspect - fit to width
          drawWidth = CANVAS_WIDTH;
          drawHeight = drawWidth / cameraAspect;
        }
      } else {
        // Desktop behavior remains the same
        drawWidth = CANVAS_WIDTH;
        drawHeight = CANVAS_WIDTH / cameraAspect;

        if (drawHeight > CANVAS_HEIGHT) {
          drawHeight = CANVAS_HEIGHT;
          drawWidth = CANVAS_HEIGHT * cameraAspect;
        }
      }

      const x = (CANVAS_WIDTH - drawWidth) / 2;
      const y = (CANVAS_HEIGHT - drawHeight) / 2;

      ctx.drawImage(cameraVideo, x, y, drawWidth, drawHeight);
    }

    animationFrameId = requestAnimationFrame(drawStreams);
  }

  // Start drawing
  requestAnimationFrame(drawStreams);

  // Clean up function
  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    if (micSourceNode) {
      micSourceNode.disconnect();
    }
    if (silentSourceNode) {
      silentSourceNode.stop();
      silentSourceNode.disconnect();
    }
    if (audioContext) {
      audioContext.close();
    }
    screenVideo.srcObject = null;
    cameraVideo.srcObject = null;
  };

  canvasStream.addEventListener('inactive', cleanup);

  // Attach the update function to the stream for external use
  (canvasStream as any).updateStreams = updateStreams;

  return canvasStream;
}

/**
 * Creates a MediaRecorder instance for recording with optimized settings
 */
export function createRecorder(stream: MediaStream): MediaRecorder {
  const mimeType = getSupportedMimeType();
  const options: MediaRecorderOptions = {
    mimeType,
    videoBitsPerSecond: 2500000,
    audioBitsPerSecond: 128000
  };
  return new MediaRecorder(stream, options);
}

/**
 * Format seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Stop all tracks in a MediaStream
 */
export function stopMediaStream(stream: MediaStream | null) {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

export interface UploadProgress {
  webhook?: {
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    error?: string;
  };
  googleDrive?: {
    status: 'pending' | 'uploading' | 'completed' | 'failed';
    progress?: number;
    error?: string;
    fileId?: string;
    canResume?: boolean;
  };
}


let googleDriveUploader: GoogleDriveUploader | null = null;

export async function uploadRecordingToGoogleDrive(
  videoBlob: Blob,
  assessmentData: any,
  isInCsmList: boolean,
  csmName: string,
  onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void,
  onError?: (error: string) => void,
  isRetry: boolean = false,
  mimeType: string = 'video/webm'
): Promise<string> {
  // Create uploader instance if it doesn't exist
  if (!googleDriveUploader) {
    googleDriveUploader = new GoogleDriveUploader();
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_${assessmentData.email}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;

  try {
    // Get current session for resume capability
    const currentSession = googleDriveUploader.getCurrentSession();

    // Only try to resume if it's a retry and we have a session
    const shouldResume = isRetry && currentSession;

    const fileId = await googleDriveUploader.uploadVideo(
      videoBlob,
      filename,
      assessmentData.email,
      isInCsmList,
      csmName,
      onProgress,
      onError,
      shouldResume ? currentSession : undefined,
      mimeType
    );

    return fileId;
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);

    // If it's a session-related error and we were trying to resume, clear the session
    if (error instanceof Error && error.message.includes('session') && isRetry) {
      googleDriveUploader.clearSession();
    }

    throw error;
  }
}

export function clearGoogleDriveSession(): void {
  if (googleDriveUploader) {
    googleDriveUploader.clearSession();
  }
}

export function canResumeGoogleDriveUpload(): boolean {
  return googleDriveUploader?.getCurrentSession() !== null;
}

export async function uploadRecordingToBothServices(
  videoBlob: Blob,
  assessmentData: any,
  isInCsmList: boolean,
  csmName: string,
  onProgressUpdate?: (progress: UploadProgress) => void,
  isRetry: boolean = false,
  mimeType: string = 'video/webm',
): Promise<{ webhookSuccess: boolean; googleDriveFileId?: string; errors: string[] }> {
  const errors: string[] = [];
  let webhookSuccess = false;
  let googleDriveFileId: string | undefined;

  // Update progress helper
  const updateProgress = (updates: Partial<UploadProgress>) => {
    if (onProgressUpdate) {
      onProgressUpdate(updates as UploadProgress);
    }
  };

  // Upload to Google Drive
  const canResume = isRetry && canResumeGoogleDriveUpload();
  updateProgress({
    googleDrive: {
      status: 'uploading',
      progress: 0,
      canResume: canResume
    }
  });

  try {
    googleDriveFileId = await uploadRecordingToGoogleDrive(
      videoBlob,
      assessmentData,
      isInCsmList,
      csmName,
      (progress) => {
        updateProgress({
          googleDrive: {
            status: 'uploading',
            progress: progress.percentage,
            canResume: canResume
          }
        });
      },
      (error) => {
        updateProgress({
          googleDrive: {
            status: 'uploading',
            error: error,
            canResume: canResume
          }
        });
      },
      isRetry,
      mimeType
    );

    updateProgress({
      googleDrive: {
        status: 'completed',
        progress: 100,
        fileId: googleDriveFileId
      }
    });

    // If Google Drive upload succeeded, submit form data
    if (googleDriveFileId) {
      updateProgress({
        webhook: {
          status: 'uploading'
        }
      });

      try {
        await submitFormData({
          ...assessmentData,
          googleDriveFileId: googleDriveFileId,
          googleDriveLink: `https://drive.google.com/file/d/${googleDriveFileId}/edit`,
          submissionTimestamp: new Date().toISOString(),
        });

        webhookSuccess = true;
        updateProgress({
          webhook: {
            status: 'completed'
          }
        });
      } catch (formError) {
        const errorMessage = formError instanceof Error ? formError.message : 'Form submission failed';
        errors.push(`Form submission: ${errorMessage}`);
        updateProgress({
          webhook: {
            status: 'failed',
            error: errorMessage
          }
        });
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Google Drive upload failed';
    errors.push(`Google Drive: ${errorMessage}`);
    updateProgress({
      googleDrive: {
        status: 'failed',
        error: errorMessage,
        canResume: canResumeGoogleDriveUpload()
      }
    });
  }

  return { webhookSuccess, googleDriveFileId, errors };
}

export async function submitFormData(formData: any): Promise<void> {
  const webhookUrl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    throw new Error('Make.com webhook URL not configured');
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Personal Information
        email: formData.email,
        prompt: formData.prompt,
        assessmentType: formData.assessmentType,
        submissionType: formData.submissionType,
        notes: formData.notes,
        // Recording Information
        googleDriveFileId: formData.googleDriveFileId,
        googleDriveLink: formData.googleDriveLink,
        recordingDuration: formData.duration,
        coachToReview: formData.coachToReview,
        // Metadata
        submissionTimestamp: formData.submissionTimestamp,
        userAgent: navigator.userAgent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Form submission failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log('Form data submitted successfully to Make.com');
  } catch (error) {
    console.error('Error submitting form data:', error);
    throw error;
  }
}

// Utility to stop all media tracks from all video/audio elements and global refs
export function stopAllMediaTracks() {
  console.log('[stopAllMediaTracks] Called');
  // Stop all tracks from all video/audio elements
  if (typeof document !== 'undefined') {
    const elements = Array.from(document.querySelectorAll('video, audio'));
    console.log(`[stopAllMediaTracks] Found ${elements.length} video/audio elements`);
    elements.forEach((el, idx) => {
      // @ts-ignore
      if (el.srcObject && el.srcObject.getTracks) {
        // @ts-ignore
        const tracks: any[] = el.srcObject.getTracks();
        console.log(`[stopAllMediaTracks] Element #${idx} has ${tracks.length} tracks`);
        tracks.forEach((track: any, tIdx: any) => {
          try {
            track.stop();
            console.log(`[stopAllMediaTracks] Stopped track #${tIdx} (${track.kind}) on element #${idx}`);
          } catch (err) {
            console.warn(`[stopAllMediaTracks] Failed to stop track #${tIdx} on element #${idx}:`, err);
          }
        });
        // @ts-ignore
        el.srcObject = null;
        console.log(`[stopAllMediaTracks] Cleared srcObject for element #${idx}`);
      } else {
        console.log(`[stopAllMediaTracks] Element #${idx} has no srcObject or getTracks`);
      }
    });
  } else {
    console.log('[stopAllMediaTracks] document is undefined');
  }
  // Stop any globally tracked streams (if used)
  if (typeof window !== 'undefined' && (window as any).localStreams) {
    const localStreams: any[] = (window as any).localStreams;
    console.log(`[stopAllMediaTracks] Found ${localStreams.length} global localStreams`);
    localStreams.forEach((stream: any, sIdx: any) => {
      const tracks: any[] = stream.getTracks();
      console.log(`[stopAllMediaTracks] Global stream #${sIdx} has ${tracks.length} tracks`);
      tracks.forEach((track: any, tIdx: any) => {
        try {
          track.stop();
          console.log(`[stopAllMediaTracks] Stopped track #${tIdx} (${track.kind}) on global stream #${sIdx}`);
        } catch (err) {
          console.warn(`[stopAllMediaTracks] Failed to stop track #${tIdx} on global stream #${sIdx}:`, err);
        }
      });
    });
    (window as any).localStreams = [];
    console.log('[stopAllMediaTracks] Cleared window.localStreams');
  } else {
    console.log('[stopAllMediaTracks] No global localStreams found');
  }
}

// Add this utility at the top (after imports)
export function getSupportedMimeType(): string | undefined {
  const possibleTypes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4'
  ];
  for (const type of possibleTypes) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}