"use client";

import React from "react";
import VideoRecorder from "@/components/recording/video-recorder";

export default function RecordPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <VideoRecorder />
    </main>
  );
}