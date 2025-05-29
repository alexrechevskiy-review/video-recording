"use client";

import { RecordingSettings } from "./types";

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

    // Get screen stream if enabled with optimized settings
    if (settings.screenShareEnabled) {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
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
 */
export function createCombinedStream(
  screenStream: MediaStream | null,
  cameraStream: MediaStream | null,
  audioStream: MediaStream | null
): MediaStream | null {
  // Set fixed canvas dimensions
  const CANVAS_WIDTH = 1280;
  const CANVAS_HEIGHT = 720;
  
  // Create a canvas element with fixed size
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  
  const ctx = canvas.getContext("2d", {
    alpha: false,
    desynchronized: true
  });
  
  if (!ctx) return null;

  // Create stream from canvas with lower framerate
  const canvasStream = canvas.captureStream(15);
  
  // Add audio track if available
  if (audioStream) {
    audioStream.getAudioTracks().forEach(track => {
      canvasStream.addTrack(track);
    });
  }
  
  // Create video elements for the streams
  const screenVideo = document.createElement("video");
  screenVideo.autoplay = true;
  screenVideo.muted = true;
  
  const cameraVideo = document.createElement("video");
  cameraVideo.autoplay = true;
  cameraVideo.muted = true;
  
  // Connect streams to video elements
  if (screenStream) {
    screenVideo.srcObject = screenStream;
  }
  
  if (cameraStream) {
    cameraVideo.srcObject = cameraStream;
  }
  
  // Camera PIP position and size
  const PIP_DIAMETER = Math.min(180, CANVAS_WIDTH * 0.15);
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
      
      // Ensure PIP stays within canvas bounds
      pipX = Math.max(0, Math.min(CANVAS_WIDTH - PIP_DIAMETER, pipX));
      pipY = Math.max(0, Math.min(CANVAS_HEIGHT - PIP_DIAMETER, pipY));
    }
  });
  
  canvas.addEventListener("mouseup", () => {
    isDragging = false;
  });

  let animationFrameId: number;
  
  // Draw function to combine streams on canvas
  function drawStreams() {
    if (!ctx) return;
    
    // Clear canvas with black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw screen share or camera as main view
    if (screenStream && screenVideo.readyState >= 2) {
      // Draw screen share maintaining aspect ratio
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
      
      // Draw circular camera PIP if camera is enabled
      if (cameraStream && cameraVideo.readyState >= 2) {
        ctx.save();
        
        // Create circular clip
        ctx.beginPath();
        const centerX = pipX + PIP_DIAMETER / 2;
        const centerY = pipY + PIP_DIAMETER / 2;
        ctx.arc(centerX, centerY, PIP_DIAMETER / 2, 0, Math.PI * 2);
        ctx.clip();
        
        // Calculate dimensions to fill circle while maintaining aspect ratio
        const cameraAspect = cameraVideo.videoWidth / cameraVideo.videoHeight;
        let pipDrawWidth = PIP_DIAMETER;
        let pipDrawHeight = PIP_DIAMETER;
        
        if (cameraAspect > 1) {
          // Landscape video
          pipDrawHeight = PIP_DIAMETER;
          pipDrawWidth = pipDrawHeight * cameraAspect;
        } else {
          // Portrait video
          pipDrawWidth = PIP_DIAMETER;
          pipDrawHeight = pipDrawWidth / cameraAspect;
        }
        
        // Center the video in the circle
        const pipOffsetX = pipX + (PIP_DIAMETER - pipDrawWidth) / 2;
        const pipOffsetY = pipY + (PIP_DIAMETER - pipDrawHeight) / 2;
        
        ctx.drawImage(cameraVideo, pipOffsetX, pipOffsetY, pipDrawWidth, pipDrawHeight);
        
        // Draw circular border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, PIP_DIAMETER / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
    } else if (cameraStream && cameraVideo.readyState >= 2) {
      // If only camera is available, fill the canvas maintaining aspect ratio
      const cameraAspect = cameraVideo.videoWidth / cameraVideo.videoHeight;
      let drawWidth = CANVAS_WIDTH;
      let drawHeight = CANVAS_WIDTH / cameraAspect;
      
      if (drawHeight > CANVAS_HEIGHT) {
        drawHeight = CANVAS_HEIGHT;
        drawWidth = CANVAS_HEIGHT * cameraAspect;
      }
      
      const x = (CANVAS_WIDTH - drawWidth) / 2;
      const y = (CANVAS_HEIGHT - drawHeight) / 2;
      
      ctx.drawImage(cameraVideo, x, y, drawWidth, drawHeight);
    }
    
    animationFrameId = requestAnimationFrame(drawStreams);
  }
  
  // Start drawing when videos are ready
  screenVideo.onloadedmetadata = () => {
    screenVideo.play();
    drawStreams();
  };
  
  cameraVideo.onloadedmetadata = () => {
    cameraVideo.play();
    drawStreams();
  };
  
  // Start initial drawing even if no streams are ready
  drawStreams();
  
  // Clean up function
  const cleanup = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    screenVideo.srcObject = null;
    cameraVideo.srcObject = null;
  };

  // Attach cleanup to stream
  canvasStream.addEventListener('inactive', cleanup);
  
  return canvasStream;
}

/**
 * Creates a MediaRecorder instance for recording with optimized settings
 */
export function createRecorder(stream: MediaStream): MediaRecorder {
  const options = {
    mimeType: 'video/webm;codecs=vp8,opus',
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