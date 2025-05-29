"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface VideoPreviewProps {
  stream: MediaStream | null;
  className?: string;
  muted?: boolean;
}

export default function VideoPreview({
  stream,
  className,
  muted = true,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg",
          "w-full h-full min-h-[300px]",
          className
        )}
      >
        <p className="text-muted-foreground">No preview available</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn(
        "w-full h-full object-cover rounded-lg bg-black",
        className
      )}
    />
  );
}