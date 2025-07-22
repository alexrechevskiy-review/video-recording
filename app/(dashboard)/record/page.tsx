"use client";

import React, { useEffect } from "react";
import VideoRecorder from "@/components/recording/video-recorder";

export default function RecordPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="flex min-h-screen flex-col">
      <VideoRecorder />
    </main>
  );
}