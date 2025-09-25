"use client";

import React from "react";
import { Mic, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface MicrophoneSelectorProps {
  availableMicrophones: MediaDeviceInfo[];
  selectedMicrophoneId?: string;
  onMicrophoneSelect: (deviceId: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function MicrophoneSelector({
  availableMicrophones,
  selectedMicrophoneId,
  onMicrophoneSelect,
  disabled = false,
  className,
}: MicrophoneSelectorProps) {
  const selectedMicrophone = availableMicrophones.find(
    mic => mic.deviceId === selectedMicrophoneId
  );

  const getMicrophoneLabel = (device: MediaDeviceInfo) => {
    if (device.label && device.label.trim() !== '') {
      // Remove device ID from the end of the label (usually in format "Device Name (ID)")
      const cleanLabel = device.label.replace(/\s*\([^)]+\)\s*$/, '').trim();
      return cleanLabel || device.label;
    }
    return `Microphone ${device.deviceId.slice(0, 8)}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-auto min-w-[200px] max-w-[250px] justify-between px-4",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Mic className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-left">
              {selectedMicrophone 
                ? getMicrophoneLabel(selectedMicrophone)
                : availableMicrophones.length > 0
                  ? getMicrophoneLabel(availableMicrophones[0])
                  : "No Microphones"
              }
            </span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-w-[90vw]">
        {availableMicrophones.length === 0 ? (
          <DropdownMenuItem disabled>
            No microphones available
          </DropdownMenuItem>
        ) : (
          availableMicrophones.map((microphone) => (
            <DropdownMenuItem
              key={microphone.deviceId}
              onClick={() => onMicrophoneSelect(microphone.deviceId)}
              className={cn(
                "cursor-pointer",
                selectedMicrophoneId === microphone.deviceId && "bg-accent"
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
  );
}
