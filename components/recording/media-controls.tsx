"use client";

import React, { useState } from "react";
import { Camera, Mic, Monitor, CameraOff, MicOff, MonitorOff, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecordingSettings } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isMobileDevice } from "@/lib/recording-utils";
import MicrophoneSelector from "./microphone-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  availableMicrophones?: MediaDeviceInfo[];
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
  availableMicrophones = [],
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

  const handleMicrophoneSelect = (deviceId: string) => {
    onSettingsChange({
      ...settings,
      selectedMicrophoneId: deviceId,
    });
  };

  const getMicrophoneLabel = (device: MediaDeviceInfo) => {
    if (device.label && device.label.trim() !== '') {
      // Remove device ID from the end of the label (usually in format "Device Name (ID)")
      const cleanLabel = device.label.replace(/\s*\([^)]+\)\s*$/, '').trim();
      return cleanLabel || device.label;
    }
    return `Microphone ${device.deviceId.slice(0, 8)}`;
  };

  return (
    <div className={cn("flex flex-row items-center justify-center gap-4", className)}>
      {/* Microphone Section */}
      <div className="flex flex-col items-center gap-2">
        {/* Mobile: Arrow above microphone button */}
        {isMobile && settings.microphoneEnabled && availableMicrophones.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="h-8 w-8 p-0"
                aria-label="Select microphone"
              >
                <ChevronUp className="h-4 w-4" />
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
                    onClick={() => handleMicrophoneSelect(microphone.deviceId)}
                    className={cn(
                      "cursor-pointer",
                      settings.selectedMicrophoneId === microphone.deviceId && "bg-accent"
                    )}
                  >
                    <div className="flex flex-col items-start min-w-0">
                      <span className="font-medium truncate w-full">
                        ffffff{getMicrophoneLabel(microphone)}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Microphone Toggle Button */}
        <div className="flex items-center gap-2">
          {/* Desktop: Arrow to the left of microphone button */}
          {!isMobile && settings.microphoneEnabled && availableMicrophones.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                  aria-label="Select microphone"
                >
                  <ChevronUp className="h-4 w-4" />
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
                      onClick={() => handleMicrophoneSelect(microphone.deviceId)}
                      className={cn(
                        "cursor-pointer",
                        settings.selectedMicrophoneId === microphone.deviceId && "bg-accent"
                      )}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium truncate w-full">
                          {getMicrophoneLabel(microphone)}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
        </div>
      </div>

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