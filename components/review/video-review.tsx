"use client";

import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecording } from "@/context/RecordingContext";
import { formatTime } from "@/lib/recording-utils";

export default function VideoReview() {
  const router = useRouter();
  const { formData, recordedData, resetData } = useRecording();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If no form data or recorded data, redirect back
  useEffect(() => {
    if (!formData || !recordedData || !recordedData.videoBlob) {
      router.replace("/");
    }
  }, [formData, recordedData, router]);

  // Set video source
  useEffect(() => {
    if (videoRef.current && recordedData?.videoBlob) {
      const videoURL = URL.createObjectURL(recordedData.videoBlob);
      videoRef.current.src = videoURL;
      
      return () => {
        URL.revokeObjectURL(videoURL);
      };
    }
  }, [recordedData]);

  const handleBack = () => {
    router.push("/record");
  };

  const handleSubmit = async () => {
    if (!recordedData?.videoBlob) return;
    
    setIsSubmitting(true);
    
    try {
      // In a real application, you would upload the video here
      // This is a simulated API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset data and redirect to confirmation
      resetData();
      router.push("/success");
    } catch (error) {
      console.error("Error submitting video:", error);
      setIsSubmitting(false);
    }
  };

  if (!recordedData?.videoBlob) {
    return null;
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="container flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <h1 className="text-lg font-medium">Review Your Recording</h1>
          
          <div className="w-10" /> {/* Spacer for symmetry */}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col container max-w-5xl py-6">
        {/* Video player */}
        <div className="flex-1 bg-black rounded-xl overflow-hidden mb-6">
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        </div>
        
        {/* Video info */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            {recordedData.videoBlob.size ? `${(recordedData.videoBlob.size / (1024 * 1024)).toFixed(2)} MB` : ""}
            {recordedData.duration ? ` • ${formatTime(recordedData.duration)}` : ""}
          </p>
        </div>
        
        {/* Submit button */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Back to Recording
          </Button>
          
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-8"
          >
            {isSubmitting ? (
              <>
                <span className="animate-pulse">Submitting...</span>
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Submit Recording
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}