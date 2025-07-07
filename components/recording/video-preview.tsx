"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { isMobileDevice } from "@/lib/recording-utils";

interface VideoPreviewProps {
  stream: MediaStream | null;
  className?: string;
  muted?: boolean;
  maxHeight?: string;
  style?: React.CSSProperties;
}

export default function VideoPreview({
  stream,
  className,
  muted = true,
  videoRef,
  maxHeight,
  style,
}: VideoPreviewProps & { videoRef?: React.RefObject<HTMLVideoElement> }) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const ref = videoRef || internalRef;
  const isMobile = isMobileDevice();

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;

      ref.current.onloadedmetadata = () => {
        console.log("Video metadata loaded");
      };
      ref.current.oncanplay = () => {
        console.log("Video can play");
      };
      ref.current.onerror = (e) => {
        console.error("Video error:", e);
      };
    }
    return () => {
      if (ref.current) {
        ref.current.srcObject = null;
      }
    };
  }, [stream, ref]);

  if (!stream) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-lg",
          "w-full h-full min-h-[576px]",
          className
        )}
        style={style || (maxHeight ? { maxHeight } : undefined)}
      >
        <p className="text-muted-foreground">No preview available</p>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={cn(
        "bg-black",
        className
      )}
      style={style || (maxHeight ? { maxHeight } : undefined)}
    />
  );
}