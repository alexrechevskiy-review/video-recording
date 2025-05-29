"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { formatTime } from "@/lib/recording-utils";
import { cn } from "@/lib/utils";

interface RecordingTimerProps {
  isRecording: boolean;
  onTimeUpdate?: (seconds: number) => void;
  maxDuration?: number; // in seconds
  className?: string;
}

export default function RecordingTimer({
  isRecording,
  onTimeUpdate,
  maxDuration = 40 * 60, // Default 40 minutes
  className,
}: RecordingTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  
  // Calculate time remaining
  const timeRemaining = maxDuration - elapsedTime;
  const isNearingLimit = timeRemaining <= 300; // 5 minutes warning
  const isAlmostDone = timeRemaining <= 60; // 1 minute warning

  // Update timer
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => {
        const newTime = prev + 1;
        
        if (onTimeUpdate) {
          onTimeUpdate(newTime);
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording, onTimeUpdate]);

  // Show warning based on remaining time
  useEffect(() => {
    if (isNearingLimit) {
      setShowWarning(true);
      
      const timeout = setTimeout(() => {
        setShowWarning(false);
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [isNearingLimit, timeRemaining]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="h-4 w-4" />
      <span className={cn(
        "text-sm font-medium",
        isAlmostDone && "text-destructive animate-pulse",
        isNearingLimit && !isAlmostDone && "text-orange-500"
      )}>
        {formatTime(elapsedTime)}
      </span>
      
      {/* Time remaining warnings */}
      {showWarning && (
        <div className={cn(
          "flex items-center gap-1 text-sm rounded-full px-3 py-1",
          "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300",
          "animate-in fade-in slide-in-from-right-4 duration-300"
        )}>
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>
            {isAlmostDone 
              ? "Less than 1 minute remaining!" 
              : "Less than 5 minutes remaining!"}
          </span>
        </div>
      )}
    </div>
  );
}