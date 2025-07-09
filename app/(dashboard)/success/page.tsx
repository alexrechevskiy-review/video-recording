'use client'
import React, { useEffect } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecording } from "@/context/RecordingContext";
import { stopAllMediaTracks } from "@/lib/recording-utils";

export default function SuccessPage() {
  const { resetData } = useRecording();

  // Clear all data when entering success page
  useEffect(() => {
    resetData();
  }, [resetData]);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => track.stop());
        })
        .catch(() => { /* ignore errors */ });
    }
  }, []);

  useEffect(() => {
    stopAllMediaTracks();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-primary/10 p-3">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Submission Complete!
        </h1>

        <p className="mb-8 text-muted-foreground">
          Your video interview has been successfully submitted. Thank you for your submission.
        </p>

        <Button asChild size="lg" className="px-8">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </main>
  );
}