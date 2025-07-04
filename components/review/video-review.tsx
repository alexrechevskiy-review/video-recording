"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecording } from "@/context/RecordingContext";
import { formatTime, uploadRecordingToBothServices, UploadProgress, clearGoogleDriveSession } from "@/lib/recording-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const calculateMobileVideoHeight = () => {
  if (typeof window === 'undefined') return 'auto';

  // Calculate available height for video on mobile
  const viewportHeight = window.innerHeight;
  const headerHeight = 73; // Header with padding
  const videoInfoHeight = 40; // Video info section
  const progressHeight = 200; // Upload progress when visible
  const buttonsHeight = 120; // Submit buttons
  const padding = 48; // Container padding

  const availableHeight = viewportHeight - headerHeight - videoInfoHeight - buttonsHeight - padding;
  return `${Math.max(availableHeight, 300)}px`; // Minimum 300px
};

export default function VideoReview() {
  const router = useRouter();
  const { formData, recordedData, resetData, clearRecordedData, resetFormExceptEmail } = useRecording();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [mobileVideoHeight, setMobileVideoHeight] = useState<string>('auto');
  const [isNavigatingToHistory, setIsNavigatingToHistory] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [isInCsmList, setIsInCsmList] = useState(false);

  const retrieveCSM = useCallback(async () => {
    try {
      const webhookurl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_CSM_LIST;
      if (!webhookurl) {
        console.error("Make.com webhook URL not configured");
        return;
      }
      const response = await fetch(webhookurl);
      const data = await response.json();
      console.log("CSM list:", data);
      if (data && formData?.email) {
        const result = data.filter(
          (e: { '✍️ Email': string; '🚫 Full Name': string }) => e['✍️ Email'] === formData.email
        );
        setIsInCsmList(result.length > 0);
      }
    } catch (error) {
      console.error("Error fetching coaches:", error);
    }
  }, [formData?.email]);

  //Retrieve CSM list
  useEffect(() => {
    retrieveCSM()
  }, [retrieveCSM])

  // Calculate mobile video height on mount and resize
  useEffect(() => {
    if (!isMobile) return;

    const updateHeight = () => {
      setMobileVideoHeight(calculateMobileVideoHeight());
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [isMobile]);

  // If no form data or recorded data, redirect back (but not if we're navigating to history)
  useEffect(() => {
    if (!isNavigatingToHistory && (!formData || !recordedData || !recordedData.videoBlob)) {
      router.replace("/");
    }
  }, [formData, recordedData, router, isNavigatingToHistory]);

  // Set video source with loading states
  useEffect(() => {
    if (videoRef.current && recordedData?.videoBlob) {
      setIsVideoLoading(true);
      setVideoLoadError(null);

      const videoURL = URL.createObjectURL(recordedData.videoBlob);
      videoRef.current.src = videoURL;

      const handleLoadedData = () => {
        setIsVideoLoading(false);
      };

      const handleError = () => {
        setIsVideoLoading(false);
        setVideoLoadError("Failed to load video. Please try recording again.");
      };

      const handleLoadStart = () => {
        setIsVideoLoading(true);
      };

      const videoElement = videoRef.current;
      videoElement.addEventListener('loadeddata', handleLoadedData);
      videoElement.addEventListener('error', handleError);
      videoElement.addEventListener('loadstart', handleLoadStart);

      return () => {
        URL.revokeObjectURL(videoURL);
        if (videoElement) {
          videoElement.removeEventListener('loadeddata', handleLoadedData);
          videoElement.removeEventListener('error', handleError);
          videoElement.removeEventListener('loadstart', handleLoadStart);
        }
      };
    }
  }, [recordedData]);

  // Add cleanup function for any remaining media streams
  const cleanupMediaStreams = () => {
    console.log("VideoReview: Cleaning up any remaining media streams...");

    // Stop any media streams that might still be active
    navigator.mediaDevices.getUserMedia({ video: false, audio: false }).catch(() => {
      // This will effectively stop any active streams by requesting nothing
    });

    // Clear video element source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Handle back navigation with cleanup
  const handleBack = () => {
    cleanupMediaStreams();
    router.push("/record");
  };

  // Handle successful submission with cleanup
  const handleSuccessfulSubmission = () => {
    cleanupMediaStreams();
    setIsNavigatingToHistory(true);

    // Navigate first, then clear data after a short delay
    router.push("/history");

    // Clear data after navigation has started
    setTimeout(() => {
      resetFormExceptEmail();
    }, 100);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log("VideoReview unmounting, cleaning up...");
      cleanupMediaStreams();
    };
  }, []);

  const performSubmission = async (isRetry: boolean = false) => {
    if (!recordedData?.videoBlob) return;

    setIsSubmitting(true);
    setUploadErrors([]);
    setSubmissionComplete(false);
    setShowRetryButton(false);

    try {
      const result = await uploadRecordingToBothServices(
        recordedData.videoBlob,
        { ...formData, ...recordedData },
        isInCsmList,
        setUploadProgress,
        isRetry,
      );

      if (result.errors.length > 0) {
        setUploadErrors(result.errors);

        // Show error toast for each error
        result.errors.forEach((error, index) => {
          setTimeout(() => {
            toast({
              variant: "destructive",
              title: "Submission Error",
              description: error,
            });
          }, index * 100); // Stagger multiple errors slightly
        });
      }

      // Consider successful if both Google Drive upload and webhook submission succeeded
      if (result.webhookSuccess && result.googleDriveFileId) {
        setSubmissionComplete(true);

        // Show success toast
        toast({
          title: "Recording Submitted Successfully!",
          description: "Your recording has been uploaded to Google Drive and your assessment information has been submitted.",
          variant: "default",
        });

        // Clear session on success
        clearGoogleDriveSession();

        // Wait a moment to show success, then redirect
        setTimeout(() => {
          handleSuccessfulSubmission();
        }, 2000);
      } else {
        // Submission failed - show retry button
        setIsSubmitting(false);
        setShowRetryButton(true);

        // Show general failure toast if no specific errors were shown
        if (result.errors.length === 0) {
          toast({
            variant: "destructive",
            title: "Submission Failed",
            description: "The submission process failed. Please try again.",
          });
        }
      }
    } catch (error) {
      console.error("Error submitting:", error);
      setIsSubmitting(false);
      const errorMessage = error instanceof Error ? error.message : 'Submission failed';
      setUploadErrors([errorMessage]);
      setShowRetryButton(true);

      // Show error toast
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: errorMessage,
      });
    }
  };

  const handleSubmit = () => {
    // Clear any existing session for fresh upload
    clearGoogleDriveSession();
    performSubmission(false);
  };

  const handleRetry = () => {
    // Reset progress state
    setUploadProgress({});
    performSubmission(true);
  };

  if (!recordedData?.videoBlob) {
    return null;
  }

  const getUploadStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const hasFailedUploads = uploadProgress.webhook?.status === 'failed' || uploadProgress.googleDrive?.status === 'failed';
  const hasAnySuccess = uploadProgress.webhook?.status === 'completed' || uploadProgress.googleDrive?.status === 'completed';

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="md:p-4 p-0 border-b flex-shrink-0">
        <div className="container flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            disabled={isSubmitting || isVideoLoading}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <h1 className="text-lg font-medium">Review Your Recording</h1>

          <div className="w-10" />
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col container m-auto py-6 overflow-hidden",
        isMobile ? "px-4 max-w-full" : "max-w-5xl"
      )}>
        {/* Video player with loading overlay - Height constrained on mobile */}
        <div className={cn(
          "relative bg-black rounded-xl overflow-hidden mb-6 flex-shrink-0",
          isMobile ? "w-full" : "flex-1"
        )}
          style={isMobile ? { height: mobileVideoHeight } : undefined}
        >
          {isVideoLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <Loader2 className="h-12 w-12 text-white animate-spin mb-4" />
              <p className="text-white text-lg font-medium mb-2">Loading your recording...</p>
              <p className="text-white/70 text-sm text-center max-w-md">
                {recordedData.videoBlob.size > 50 * 1024 * 1024
                  ? "Large video detected. This may take a moment to process."
                  : "Please wait while we prepare your video for review."
                }
              </p>
              <div className="mt-4 text-white/50 text-xs">
                Video size: {(recordedData.videoBlob.size / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          )}

          {videoLoadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
              <div className="text-red-400 text-center">
                <svg className="h-12 w-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-lg font-medium mb-2">{videoLoadError}</p>
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="mt-4 border-red-400 text-red-400 hover:bg-red-400/10"
                >
                  Back to Recording
                </Button>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            controls={!isVideoLoading}
            autoPlay={false}
            playsInline
            className="w-full h-full object-contain"
            style={{ opacity: isVideoLoading ? 0.3 : 1 }}
          />
        </div>

        {/* Video info - Fixed height */}
        {!isVideoLoading && !videoLoadError && (
          <div className="mb-6 flex-shrink-0">
            <p className="text-sm text-muted-foreground">
              {recordedData.videoBlob.size ? `${(recordedData.videoBlob.size / (1024 * 1024)).toFixed(2)} MB` : ""}
              {recordedData.duration ? ` • ${formatTime(recordedData.duration)}` : ""}
            </p>
          </div>
        )}

        {/* Upload Progress - Scrollable if needed on mobile */}
        {(isSubmitting || hasFailedUploads || hasAnySuccess) && (
          <div className={cn(
            "mb-6 p-4 bg-gray-50 rounded-lg border",
            isMobile ? "flex-shrink-0 max-h-48 overflow-y-auto" : "flex-shrink-0"
          )}>
            <h3 className="text-sm font-medium mb-4">Submission Progress</h3>

            {/* Google Drive Upload Status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getUploadStatusIcon(uploadProgress.googleDrive?.status)}
                <span className="text-sm">Google Drive Upload</span>
              </div>
              <span className="text-xs text-gray-500">
                {uploadProgress.googleDrive?.status === 'completed' && 'Complete'}
                {uploadProgress.googleDrive?.status === 'failed' && 'Failed'}
                {uploadProgress.googleDrive?.status === 'uploading' && `${uploadProgress.googleDrive.progress || 0}%`}
                {uploadProgress.googleDrive?.status === 'pending' && 'Pending'}
              </span>
            </div>

            {/* Progress Bar for Google Drive */}
            {uploadProgress.googleDrive?.status === 'uploading' && (
              <div className="mt-2 mb-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${uploadProgress.googleDrive.progress || 0}%` }}
                    className="h-full bg-primary transition-all"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Uploading to Google Drive... {uploadProgress.googleDrive.progress || 0}%
                </p>
              </div>
            )}

            {/* Form Submission Status */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getUploadStatusIcon(uploadProgress.webhook?.status)}
                <span className="text-sm">Form Submission</span>
              </div>
              <span className="text-xs text-gray-500">
                {uploadProgress.webhook?.status === 'completed' && 'Complete'}
                {uploadProgress.webhook?.status === 'failed' && 'Failed'}
                {uploadProgress.webhook?.status === 'uploading' && 'Submitting...'}
                {uploadProgress.webhook?.status === 'pending' && 'Pending'}
              </span>
            </div>

            {/* Current Error Messages */}
            {(uploadProgress.googleDrive?.error || uploadProgress.webhook?.error) && (
              <div className="mt-2 text-xs text-orange-600">
                {uploadProgress.googleDrive?.error && <div>Google Drive: {uploadProgress.googleDrive.error}</div>}
                {uploadProgress.webhook?.error && <div>Form: {uploadProgress.webhook.error}</div>}
              </div>
            )}

            {/* Retry Button */}
            {showRetryButton && !isSubmitting && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {uploadProgress.googleDrive?.canResume
                      ? `Upload failed. Can resume from ${uploadProgress.googleDrive.progress || 0}%`
                      : 'Submission failed'
                    }
                  </div>
                  <Button
                    onClick={handleRetry}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {uploadProgress.googleDrive?.canResume ? 'Resume Submission' : 'Retry Submission'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit button - Fixed at bottom */}
        <div className="flex md:flex-row flex-col justify-between gap-4 p-2 md:p-0 flex-shrink-0">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            Back to Recording
          </Button>

          {!submissionComplete ? (
            !showRetryButton ? (
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || isVideoLoading || Boolean(videoLoadError)}
                className="px-8"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-5 w-5" />
                    Submit Recording
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={handleRetry}
                disabled={isSubmitting}
                className="px-8"
                variant="default"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Retry Submission
                  </>
                )}
              </Button>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}