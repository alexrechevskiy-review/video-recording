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
}

export default function MediaControls({
  settings,
  onSettingsChange,
  disabled = false,
  className,
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
      )}
    </div>
  );
}