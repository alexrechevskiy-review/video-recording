"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PlayCircle, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/lib/recording-utils";

export default function VideoRecorder() {
  const router = useRouter();
  const { formData, setRecordedData } = useRecording();
  
  // Recording states
  const [settings, setSettings] = useState<RecordingSettings>({
    cameraEnabled: true,
    microphoneEnabled: true,
    screenShareEnabled: false,
  });
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for streams and recorder
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // If no form data, redirect back to form
  useEffect(() => {
    if (!formData) {
      router.replace("/");
    }
  }, [formData, router]);

  // Handle media stream updates
  useEffect(() => {
    async function updateStreams() {
      try {
        setError(null);

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
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 640 },
                height: { ideal: 360 },
                facingMode: "user"
              }
            });
            cameraStreamRef.current = stream;
          } catch (err) {
            if (err instanceof DOMException && err.name === "NotAllowedError") {
              setError("Camera access denied. Please grant permission in your browser.");
              setSettings(prev => ({ ...prev, cameraEnabled: false }));
            }
          }
        }

        if (settings.microphoneEnabled && !audioStreamRef.current) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true
            });
            audioStreamRef.current = stream;
          } catch (err) {
            if (err instanceof DOMException && err.name === "NotAllowedError") {
              setError("Microphone access denied. Please grant permission in your browser.");
              setSettings(prev => ({ ...prev, microphoneEnabled: false }));
            }
          }
        }

        if (settings.screenShareEnabled && !screenStreamRef.current) {
          try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                cursor: "always",
                frameRate: { max: 15 }
              }
            });

            stream.getVideoTracks()[0].onended = () => {
              setSettings(prev => ({ ...prev, screenShareEnabled: false }));
            };

            screenStreamRef.current = stream;
          } catch (err) {
            if (err instanceof DOMException && err.name === "NotAllowedError") {
              setError("Screen sharing access denied. Please grant permission in your browser.");
              setSettings(prev => ({ ...prev, screenShareEnabled: false }));
            }
          }
        }

        // Create combined preview stream
        const combinedStream = createCombinedStream(
          screenStreamRef.current,
          cameraStreamRef.current,
          audioStreamRef.current
        );

        setPreviewStream(combinedStream);

      } catch (error) {
        console.error("Error updating media streams:", error);
        setError("Failed to access media devices. Please check your permissions.");
      }
    }

    updateStreams();
  }, [settings]);

  // Start recording after countdown
  const startRecordingAfterCountdown = () => {
    setIsCountingDown(true);
  };
  
  // Actually start recording
  const startRecording = async () => {
    setIsCountingDown(false);
    recordedChunksRef.current = [];
    setError(null);
    
    try {
      // Create combined stream for recording
      const combinedStream = createCombinedStream(
        screenStreamRef.current,
        cameraStreamRef.current,
        audioStreamRef.current
      );
      
      if (!combinedStream) {
        throw new Error("No valid video source available");
      }
      
      recordingStreamRef.current = combinedStream;
      setPreviewStream(combinedStream);
      
      // Create recorder
      const recorder = createRecorder(combinedStream);
      mediaRecorderRef.current = recorder;
      
      // Set up recorder events
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const recordedBlob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        
        setRecordedData({
          videoBlob: recordedBlob,
          duration: recordingDuration,
        });
        
        // Navigate to review
        router.push("/review");
      };
      
      // Start recording
      recorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error("Error starting recording:", error);
      setError("Failed to start recording. Please ensure at least one video source is enabled.");
      setIsCountingDown(false);
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    
    // Stop recording stream
    if (recordingStreamRef.current) {
      stopMediaStream(recordingStreamRef.current);
    }
    
    setIsRecording(false);
  };
  
  // Handle back button
  const handleBack = () => {
    if (isRecording) {
      stopRecording();
    }
    router.push("/");
  };
  
  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="container flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            disabled={isCountingDown}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {isRecording && (
            <RecordingTimer
              isRecording={isRecording}
              onTimeUpdate={setRecordingDuration}
            />
          )}
          
          <div className="w-10" /> {/* Spacer for symmetry */}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col container max-w-5xl py-6">
        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}
        
        {/* Video preview */}
        <div className="relative flex-1 bg-black rounded-xl overflow-hidden mb-6">
          <VideoPreview
            stream={previewStream}
            className="w-full h-full object-contain"
          />
          
          {/* Countdown overlay */}
          {isCountingDown && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <CountdownTimer onComplete={startRecording} />
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex flex-col items-center space-y-6 pb-6">
          <MediaControls
            settings={settings}
            onSettingsChange={setSettings}
            disabled={false}
            className="mb-4"
          />
          
          <div className="flex gap-4">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={startRecordingAfterCountdown}
                disabled={
                  isCountingDown || 
                  (!settings.cameraEnabled && !settings.screenShareEnabled) ||
                  Boolean(error)
                }
                className="bg-destructive hover:bg-destructive/90 text-white px-8 transition-all duration-300"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Start Recording
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                onClick={stopRecording}
                className="px-8 border-destructive text-destructive hover:bg-destructive/10"
              >
                <StopCircle className="mr-2 h-5 w-5" />
                Stop Recording
              </Button>
            )}
            
            <Button
              variant="outline"
              size="lg"
              onClick={handleBack}
              disabled={isCountingDown}
            >
              Back to Form
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}