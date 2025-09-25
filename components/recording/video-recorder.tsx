"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlayCircle, StopCircle, X, Camera, Mic, CameraOff, MicOff, Play, Square, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRecording } from "@/context/RecordingContext";
import VideoPreview from "./video-preview";
import MediaControls from "./media-controls";
import CountdownTimer from "./countdown-timer";
import RecordingTimer from "./recording-timer";
import { RecordingSettings } from "@/lib/types";
import {
  createCombinedStream,
  createRecorder,
  stopMediaStream,
  isMobileDevice,
} from "@/lib/recording-utils";
import { cn } from "@/lib/utils";

// Add this helper at the top (outside the component)
function replaceVideoStream(videoEl: HTMLVideoElement, newStream: MediaStream) {
  if (videoEl.srcObject !== newStream) {
    videoEl.srcObject = newStream;
  }
}

// Add this helper function at the top of the component
const calculateMobileVideoHeight = () => {
  if (typeof window === 'undefined') return 'auto';

  // Calculate available height for video on mobile
  const viewportHeight = window.innerHeight;
  const headerHeight = 73; // Header with padding
  const controlsHeight = 130; // Media controls + buttons + spacing
  const errorHeight = 100; // Approximate error message height when shown
  const padding = 48; // Container padding

  const availableHeight = viewportHeight - headerHeight - controlsHeight - padding;
  return `${Math.max(availableHeight, 300)}px`; // Minimum 300px
};

// After obtaining a stream (camera, mic, screen), push it to window.localStreams and log it
function trackStream(stream: any, label: any) {
  if (typeof window !== 'undefined') {
    (window as any).localStreams = (window as any).localStreams || [];
    (window as any).localStreams.push(stream);
    console.log(`[trackStream] Added ${label} stream to window.localStreams. Total now:`, (window as any).localStreams.length);
  }
}

export default function VideoRecorder() {
  const router = useRouter();
  const { formData, setRecordedData } = useRecording();

  // Recording states
  const [settings, setSettings] = useState<RecordingSettings>({
    cameraEnabled: true,
    microphoneEnabled: true,
    screenShareEnabled: false,
    selectedMicrophoneId: undefined,
  });
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Refs for streams and recorder
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const combinedStreamRef = useRef<MediaStream | null>(null);

  // Add this ref at the top of the VideoRecorder component
  const recordingStartTimeRef = useRef<number | null>(null);

  const isMobile = isMobileDevice();
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [mobileVideoHeight, setMobileVideoHeight] = useState<string>('auto');

  // Calculate mobile video height on mount and resize
  useEffect(() => {
    if (!isMobile) return;

    const updateHeight = () => {
      setMobileVideoHeight(calculateMobileVideoHeight());
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [isMobile]);

  // If no form data, redirect back to form - but only after a delay to ensure data is loaded
  useEffect(() => {
    const checkFormData = () => {
      if (!formData) {
        console.log("No form data found, redirecting to form");
        router.replace("/");
      }
    };

    // Add a small delay to ensure the context has time to load
    const timer = setTimeout(checkFormData, 100);

    return () => clearTimeout(timer);
  }, [formData, router]);

  // Initialize settings for mobile - disable screen share
  useEffect(() => {
    if (isMobile) {
      setSettings(prev => ({
        ...prev,
        screenShareEnabled: false
      }));
    }
  }, [isMobile]);

  // Handle media stream updates
  useEffect(() => {
    let isMounted = true;

    async function updateStreams() {
      try {
        // Don't clear error if it's a permission-related error that needs user action
        if (error && !error.includes("address bar") && !error.includes("refresh")) {
          setError(null);
        }

        // Stop existing streams if settings changed
        if (!settings.cameraEnabled && cameraStreamRef.current) {
          stopMediaStream(cameraStreamRef.current);
          cameraStreamRef.current = null;
        }
        if (!settings.microphoneEnabled && audioStreamRef.current) {
          stopMediaStream(audioStreamRef.current);
          audioStreamRef.current = null;
        }
        if (!settings.screenShareEnabled && screenStreamRef.current) {
          stopMediaStream(screenStreamRef.current);
          screenStreamRef.current = null;
        }

        // Get new streams based on settings
        if (settings.cameraEnabled && !cameraStreamRef.current) {
          try {
            console.log("Requesting camera stream...");
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 360 },
                facingMode: "user",
                frameRate: { ideal: 10 },
              }
            });
            console.log("Camera stream obtained:", stream);
            cameraStreamRef.current = stream;
            trackStream(stream, 'camera');
          } catch (error: any) {
            console.error("Camera access failed:", error);

            let errorMessage = "Failed to access camera.";

            if (error.name === "NotAllowedError") {
              errorMessage = isMobile
                ? "Camera access denied. Please allow camera access in your browser settings and refresh the page."
                : "Camera access denied. Please click the camera icon in your browser's address bar and allow camera access, then refresh the page.";
            } else if (error.name === "NotFoundError") {
              errorMessage = "No camera found. Please connect a camera and try again.";
            } else if (error.name === "NotReadableError") {
              errorMessage = "Camera is being used by another application. Please close other apps using the camera and try again.";
            } else if (error.name === "OverconstrainedError") {
              errorMessage = "Camera doesn't support the required settings. Please try with a different camera.";
            } else if (error.name === "SecurityError") {
              errorMessage = "Camera access blocked due to security restrictions. Please ensure you're using HTTPS and try again.";
            }

            setError(errorMessage);
            setSettings(prev => ({ ...prev, cameraEnabled: false }));
            return;
          }
        }

        if (settings.microphoneEnabled && !audioStreamRef.current) {
          try {
            console.log("Requesting microphone stream...");
            const audioConstraints: MediaTrackConstraints = {
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 44100,
            };
            
            // Add device ID if a specific microphone is selected
            if (settings.selectedMicrophoneId) {
              audioConstraints.deviceId = { exact: settings.selectedMicrophoneId };
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: audioConstraints,
              video: false,
            });
            console.log("Microphone stream obtained:", stream);
            audioStreamRef.current = stream;
            trackStream(stream, 'microphone');
          } catch (error: any) {
            console.error("Microphone access failed:", error);

            let errorMessage = "Failed to access microphone.";

            if (error.name === "NotAllowedError") {
              errorMessage = isMobile
                ? "Microphone access denied. Please allow microphone access in your browser settings and refresh the page."
                : "Microphone access denied. Please click the microphone icon in your browser's address bar and allow microphone access, then refresh the page.";
            } else if (error.name === "NotFoundError") {
              errorMessage = "No microphone found. Please connect a microphone and try again.";
            } else if (error.name === "NotReadableError") {
              errorMessage = "Microphone is being used by another application. Please close other apps using the microphone and try again.";
            } else if (error.name === "OverconstrainedError") {
              errorMessage = "Microphone doesn't support the required settings. Please try with a different microphone.";
            } else if (error.name === "SecurityError") {
              errorMessage = "Microphone access blocked due to security restrictions. Please ensure you're using HTTPS and try again.";
            }

            setError(errorMessage);
            setSettings(prev => ({ ...prev, microphoneEnabled: false }));
            return;
          }
        }

        // Only attempt screen share on non-mobile devices
        if (settings.screenShareEnabled && !screenStreamRef.current && !isMobile) {
          try {
            console.log("Requesting screen share...");
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                frameRate: { max: 10 },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            });
            console.log("Screen share obtained:", stream);
            screenStreamRef.current = stream;
            trackStream(stream, 'screen');

            // Add event listener for when user stops screen sharing
            stream.getVideoTracks()[0].onended = () => {
              console.log("Screen share ended by user");
              setSettings(prev => ({ ...prev, screenShareEnabled: false }));
            };
          } catch (error: any) {
            console.error("Screen share failed:", error);

            let errorMessage = "Failed to access screen share.";

            if (error.name === "NotAllowedError") {
              errorMessage = "Screen sharing denied. Please try again and select a screen or window to share.";
            } else if (error.name === "NotFoundError") {
              errorMessage = "No screen available for sharing. Please try again.";
            } else if (error.name === "NotReadableError") {
              errorMessage = "Screen sharing is not available. Please try again.";
            } else if (error.name === "SecurityError") {
              errorMessage = "Screen sharing blocked due to security restrictions. Please ensure you're using HTTPS and try again.";
            }

            setError(errorMessage);
            setSettings(prev => ({ ...prev, screenShareEnabled: false }));
            return;
          }
        }

        if (!isMounted) return;

        // Create or update combined stream
        if (!combinedStreamRef.current) {
          console.log("Creating new combined stream...");
          const combinedStream = createCombinedStream(
            settings.screenShareEnabled && !isMobile ? screenStreamRef.current : null,
            settings.cameraEnabled ? cameraStreamRef.current : null,
            settings.microphoneEnabled ? audioStreamRef.current : null
          );
          console.log("Combined stream created:", combinedStream);
          combinedStreamRef.current = combinedStream;
          setPreviewStream(combinedStream);
        } else {
          console.log("Updating existing combined stream...");
          const updateStreams = (combinedStreamRef.current as any).updateStreams;
          if (updateStreams) {
            updateStreams(
              settings.screenShareEnabled && !isMobile ? screenStreamRef.current : null,
              settings.cameraEnabled ? cameraStreamRef.current : null,
              settings.microphoneEnabled ? audioStreamRef.current : null
            );
          }
        }

      } catch (error) {
        console.error("Error updating media streams:", error);
        setError("Failed to access media devices. Please check your permissions and try again.");
      }
    }

    updateStreams();

    return () => {
      isMounted = false;
    };
  }, [settings, isMobile]); // Add isMobile to dependencies

  // Start recording after countdown
  const startRecordingAfterCountdown = () => {
    setIsCountingDown(true);
  };

  // Start recording - updated validation logic
  const startRecording = async () => {
    setIsCountingDown(false);
    recordedChunksRef.current = [];
    setError(null);

    try {
      // Check if microphone is enabled (required for recording)
      if (!settings.microphoneEnabled) {
        throw new Error("Microphone is required for recording");
      }

      // Check if we have at least audio stream
      if (!audioStreamRef.current) {
        throw new Error("No audio source available for recording");
      }

      if (!combinedStreamRef.current) {
        throw new Error("No valid recording source available");
      }

      // Create recorder with the continuous stream
      const recorder = createRecorder(combinedStreamRef.current);
      mediaRecorderRef.current = recorder;

      // Set the start time
      recordingStartTimeRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || "video/webm";
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: mimeType,
        });

        // Calculate the duration based on start time
        let duration = recordingDuration;
        if (recordingStartTimeRef.current) {
          duration = Math.round((Date.now() - recordingStartTimeRef.current) / 1000);
        }

        setRecordedData({
          videoBlob: recordedBlob,
          duration,
          mimeType,
        });

        router.push("/review");
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error("Error starting recording:", error);
      if (error instanceof Error && error.message.includes("Microphone is required")) {
        setError("Microphone is required for recording. Please enable your microphone to continue.");
      } else if (error instanceof Error && error.message.includes("No audio source")) {
        setError("No audio source available. Please enable your microphone and ensure it's working properly.");
      } else {
        setError("Failed to start recording. Please ensure your microphone is enabled and working properly.");
      }
      setIsCountingDown(false);
    }
  };

  // Stop recording - simple
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Add cleanup function
  const cleanupMediaStreams = () => {
    console.log("Cleaning up media streams...");

    // Stop all individual streams
    if (cameraStreamRef.current) {
      stopMediaStream(cameraStreamRef.current);
      cameraStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      stopMediaStream(screenStreamRef.current);
      screenStreamRef.current = null;
    }

    if (audioStreamRef.current) {
      stopMediaStream(audioStreamRef.current);
      audioStreamRef.current = null;
    }

    // Stop combined stream
    if (combinedStreamRef.current) {
      stopMediaStream(combinedStreamRef.current);
      combinedStreamRef.current = null;
    }

    // Stop preview stream
    if (previewStream) {
      stopMediaStream(previewStream);
      setPreviewStream(null);
    }

    // Stop any recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  // Handle back button with cleanup
  const handleBack = () => {
    if (isRecording) {
      stopRecording();
    }

    // Clean up all media streams before navigating
    cleanupMediaStreams();

    router.push("/");
  };

  const handleSettingsChange = (newSettings: RecordingSettings) => {
    // Prevent enabling screen share on mobile
    if (isMobile && newSettings.screenShareEnabled) {
      return;
    }
    setSettings(newSettings);
  };

  // Add this function at the top of the component
  const checkPermissions = async () => {
    try {
      // Only check permissions if we haven't already detected permission issues
      if (error) return;

      // Check camera permission
      if (settings.cameraEnabled) {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (cameraPermission.state === 'denied') {
          setError("Camera permission is blocked. Please click the camera icon in your browser's address bar, allow camera access, and refresh the page.");
          setSettings(prev => ({ ...prev, cameraEnabled: false }));
          return;
        }
      }

      // Check microphone permission
      if (settings.microphoneEnabled) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (micPermission.state === 'denied') {
          setError("Microphone permission is blocked. Please click the microphone icon in your browser's address bar, allow microphone access, and refresh the page.");
          setSettings(prev => ({ ...prev, microphoneEnabled: false }));
          return;
        }
      }
    } catch (error) {
      // Permissions API not supported in all browsers, continue with normal flow
      console.log("Permissions API not supported, continuing with normal flow");
    }
  };

  // Function to get available microphones
  const getAvailableMicrophones = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const microphones = devices.filter(device => device.kind === 'audioinput');
      setAvailableMicrophones(microphones);
      
      // If no microphone is selected and we have microphones available, select the first one
      if (!settings.selectedMicrophoneId && microphones.length > 0) {
        setSettings(prev => ({
          ...prev,
          selectedMicrophoneId: microphones[0].deviceId
        }));
      }
    } catch (error) {
      console.error("Error getting microphones:", error);
    }
  };

  // Add this useEffect to check permissions when component mounts ONLY
  useEffect(() => {
    checkPermissions();
    getAvailableMicrophones();
  }, []); // Empty dependency array - only run once on mount

  // Listen for device changes
  useEffect(() => {
    const handleDeviceChange = () => {
      getAvailableMicrophones();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("VideoRecorder unmounting, cleaning up streams...");
      cleanupMediaStreams();
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {isMobile ? (
        // Mobile: Full height video with overlay controls
        <div className="relative w-full h-screen overflow-hidden">
          {/* Full height video preview */}
          <VideoPreview
            stream={previewStream}
            className="absolute inset-0 object-cover"
            style={
              isInIframe && !isMobile
                ? { width: '640px', height: '400px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
                : { width: '100%', height: '100%' }
            }
            videoRef={previewVideoRef}
          />

          {/* Top overlay - Back button and prompt */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/50 to-transparent flex flex-col gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              disabled={isCountingDown}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="text-white md:block hidden text-base font-medium text-center truncate max-w-xs mx-auto" title={formData?.prompt || ''}>
              {formData?.prompt || <span className="text-gray-300">No prompt</span>}
            </span>
          </div>

          {/* Recording timer overlay */}
          {isRecording && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
              <RecordingTimer
                isRecording={isRecording}
                onTimeUpdate={setRecordingDuration}
                className="bg-black/50 text-white px-3 py-1 rounded-full"
              />
            </div>
          )}

          {/* Error message overlay */}
          {error && (
            <div className="absolute top-16 left-4 right-4 z-20">
              <div className="p-4 bg-destructive/90 border border-destructive/20 text-white rounded-lg">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-white mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white mb-1">Permission Required</h3>
                    <p className="text-sm text-white/80">{error}</p>
                    {(error.includes("address bar") || error.includes("refresh")) && (
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-3 text-sm bg-white text-destructive px-3 py-1 rounded hover:bg-white/90 transition-colors"
                      >
                        Refresh Page
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Countdown overlay */}
          {isCountingDown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-30">
              <CountdownTimer onComplete={startRecording} />
            </div>
          )}

          {/* Bottom overlay - Controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-6 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-between">
              {/* Left - Back to Form button */}
              <Button
                variant="outline"
                size="sm"
                className="bg-white/20 opacity-0 md:block hidden w-[88px] border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
              >
                Back
              </Button>

              {/* Mobile: Microphone section with arrow above */}
              {isMobile ? (
                <div className="flex flex-col items-center">
                  {/* Arrow above microphone button */}
                  {settings.microphoneEnabled && availableMicrophones.length > 1 && (
                    <div className="relative">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={false}
                            className="absolute -top-8 left-1/2 transform -translate-x-1/2 h-8 w-8 p-0 text-white hover:bg-white/20"
                            aria-label="Select microphone"
                          >
                            <ChevronUp size={12} />
                          </Button>
                        </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-64" side="bottom">
                        {availableMicrophones.length === 0 ? (
                          <DropdownMenuItem disabled>
                            No microphones available
                          </DropdownMenuItem>
                        ) : (
                          availableMicrophones.map((microphone) => (
                            <DropdownMenuItem
                              key={microphone.deviceId}
                              onClick={() => handleSettingsChange({
                                ...settings,
                                selectedMicrophoneId: microphone.deviceId,
                              })}
                              className={cn(
                                "cursor-pointer",
                                settings.selectedMicrophoneId === microphone.deviceId && "bg-accent"
                              )}
                            >
                              <div className="flex flex-col items-start min-w-0">
                                <span className="font-medium truncate w-full">
                                  {microphone.label && microphone.label.trim() !== ''
                                    ? microphone.label.replace(/\s*\([^)]+\)\s*$/, '').trim() || microphone.label
                                    : `Microphone ${microphone.deviceId.slice(0, 8)}`
                                  }
                                </span>
                              </div>
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  
                  {/* Microphone toggle button */}
                  <Button
                    variant={settings.microphoneEnabled ? "default" : "outline"}
                    size="icon"
                    onClick={() => handleSettingsChange({
                      ...settings,
                      microphoneEnabled: !settings.microphoneEnabled,
                    })}
                    disabled={false}
                    className={cn(
                      "h-10 w-10 rounded-full",
                      settings.microphoneEnabled
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                    )}
                  >
                    {settings.microphoneEnabled ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <MicOff className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                /* Desktop: Microphone button without arrow */
                <Button
                  variant={settings.microphoneEnabled ? "default" : "outline"}
                  size="icon"
                  onClick={() => handleSettingsChange({
                    ...settings,
                    microphoneEnabled: !settings.microphoneEnabled,
                  })}
                  disabled={false}
                  className={cn(
                    "h-10 w-10 rounded-full",
                    settings.microphoneEnabled
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                  )}
                >
                  {settings.microphoneEnabled ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Center - Record button */}
              <div className="flex-1 flex justify-center">
                {!isRecording ? (
                  <Button size="lg"
                    onClick={startRecordingAfterCountdown}
                    disabled={
                      isCountingDown ||
                      !settings.microphoneEnabled || // Only require microphone
                      Boolean(error)
                    }
                    className="relative w-16 h-16 rounded-full ring-2 ring-white flex items-center justify-center bg-transparent hover:bg-gray-100/10 focus:outline-none">
                    <div className="p-[29px] rounded-full bg-red-600">
                    </div>
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={stopRecording}
                    className="relative w-16 h-16 rounded-full ring-1 ring-white flex items-center justify-center bg-transparent hover:bg-gray-100/10 focus:outline-none"
                  >
                    <div className="p-[10px] rounded-[2px] bg-red-600">
                    </div>
                  </Button>
                )}
              </div>

              {/* Right - Media controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant={settings.cameraEnabled ? "default" : "outline"}
                  size="icon"
                  onClick={() => handleSettingsChange({
                    ...settings,
                    cameraEnabled: !settings.cameraEnabled,
                  })}
                  disabled={false}
                  className={cn(
                    "h-10 w-10 rounded-full",
                    settings.cameraEnabled
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-sm"
                  )}
                >
                  {settings.cameraEnabled ? (
                    <Camera className="h-4 w-4" />
                  ) : (
                    <CameraOff className="h-4 w-4" />
                  )}
                </Button>

              </div>
            </div>
          </div>
        </div>
      ) : (
        // Desktop: Keep existing layout
        <>
          {/* Header */}
          <div className="md:p-4 p-0 border-b flex-shrink-0">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                disabled={isCountingDown}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 flex flex-col items-center">
                <span className="text-base font-medium text-center max-w-xs md:max-w-md" title={formData?.prompt || ''}>
                  {formData?.prompt || <span className="text-gray-400">No prompt</span>}
                </span>
              </div>
              <div className="flex items-center min-w-[80px] justify-end">
                {isRecording && (
                  <RecordingTimer
                    isRecording={isRecording}
                    onTimeUpdate={setRecordingDuration}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col container m-auto py-6 overflow-hidden max-w-5xl">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-6 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg flex-shrink-0">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-destructive mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-destructive mb-1">Permission Required</h3>
                    <p className="text-sm text-destructive/80">{error}</p>
                    {(error.includes("address bar") || error.includes("refresh")) && (
                      <button
                        onClick={() => window.location.reload()}
                        className="mt-3 text-sm bg-destructive text-white px-3 py-1 rounded hover:bg-destructive/90 transition-colors"
                      >
                        Refresh Page
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Video preview */}
            <div className="relative bg-black rounded-xl overflow-hidden mb-6 flex items-center justify-center flex-1">
              <VideoPreview
                stream={previewStream}
                className="object-contain"
                style={
                  isInIframe && !isMobile
                    ? { width: '640px', height: '400px' }
                    : { width: '100%', height: '100%' }
                }
                videoRef={previewVideoRef}
              />

              {/* Countdown overlay */}
              {isCountingDown && (
                <div className="absolute right-4 inset-0 flex items-center justify-center bg-black/50">
                  <CountdownTimer onComplete={startRecording} />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center space-y-6 pb-6 flex-shrink-0">
              <MediaControls
                settings={settings}
                onSettingsChange={handleSettingsChange}
                disabled={false}
                className="mb-4"
                isRecording={isRecording}
                isCountingDown={isCountingDown}
                error={error}
                startRecordingAfterCountdown={startRecordingAfterCountdown}
                stopRecording={stopRecording}
                availableMicrophones={availableMicrophones}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}