"use client";

import React from "react";
import { Camera, Mic, Monitor, CameraOff, MicOff, MonitorOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordingSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isMobileDevice } from "@/lib/recording-utils";

interface MediaControlsProps {
  settings: RecordingSettings;
  onSettingsChange: (settings: RecordingSettings) => void;
  disabled?: boolean;
  className?: string;
  isRecording: boolean;
  isCountingDown: boolean;
  error: string | null;
  startRecordingAfterCountdown: () => void;
  stopRecording: () => void;
}

export default function MediaControls({
  settings,
  onSettingsChange,
  disabled = false,
  className,
  isRecording,
  isCountingDown,
  error,
  startRecordingAfterCountdown,
  stopRecording,
}: MediaControlsProps) {
  const isMobile = isMobileDevice();

  const toggleCamera = () => {
    onSettingsChange({
      ...settings,
      cameraEnabled: !settings.cameraEnabled,
    });
  };

  const toggleMicrophone = () => {
    onSettingsChange({
      ...settings,
      microphoneEnabled: !settings.microphoneEnabled,
    });
  };

  const toggleScreenShare = () => {
    onSettingsChange({
      ...settings,
      screenShareEnabled: !settings.screenShareEnabled,
    });
  };

  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>

      <Button
        variant={settings.microphoneEnabled ? "default" : "outline"}
        size="icon"
        onClick={toggleMicrophone}
        disabled={disabled}
        className="h-12 w-12 rounded-full"
        aria-label={settings.microphoneEnabled ? "Turn microphone off" : "Turn microphone on"}
      >
        {settings.microphoneEnabled ? (
          <Mic className="h-5 w-5" />
        ) : (
          <MicOff className="h-5 w-5" />
        )}
      </Button>

      {!isMobile && (
        <>

          {/* Start/Stop Recording Button (desktop, circular, mobile style) */}
          {!isRecording ? (
            <Button
              size="icon"
              onClick={startRecordingAfterCountdown}
              disabled={isCountingDown || !settings.microphoneEnabled || Boolean(error) || disabled}
              className="relative h-16 w-16 rounded-full ring-2 ring-gray-200 flex items-center justify-center bg-transparent hover:bg-gray-100/10 focus:outline-none"
              aria-label="Start Recording"
            >
              <div className="p-[29px] rounded-full bg-red-600"></div>
            </Button>
          ) : (
            <Button
              size="icon"
              variant="outline"
              onClick={stopRecording}
              className="relative h-16 w-16 rounded-full ring-1 ring-white flex items-center justify-center bg-transparent hover:bg-gray-100/10 focus:outline-none"
              aria-label="Stop Recording"
            >
              <div className="p-[10px] rounded-[2px] bg-red-600"></div>
            </Button>
          )}
          <Button
            variant={settings.screenShareEnabled ? "default" : "outline"}
            size="icon"
            onClick={toggleScreenShare}
            disabled={disabled}
            className="h-12 w-12 rounded-full"
            aria-label={settings.screenShareEnabled ? "Turn screen share off" : "Turn screen share on"}
          >
            {settings.screenShareEnabled ? (
              <Monitor className="h-5 w-5" />
            ) : (
              <MonitorOff className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant={settings.cameraEnabled ? "default" : "outline"}
            size="icon"
            onClick={toggleCamera}
            disabled={disabled}
            className="h-12 w-12 rounded-full"
            aria-label={settings.cameraEnabled ? "Turn camera off" : "Turn camera on"}
          >
            {settings.cameraEnabled ? (
              <Camera className="h-5 w-5" />
            ) : (
              <CameraOff className="h-5 w-5" />
            )}
          </Button>

        </>
      )}
    </div>
  );
}