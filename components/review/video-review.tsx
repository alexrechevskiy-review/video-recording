"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2, CheckCircle, AlertCircle, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecording } from "@/context/RecordingContext";
import { formatTime, uploadRecordingToBothServices, UploadProgress, clearGoogleDriveSession, stopAllMediaTracks } from "@/lib/recording-utils";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const calculateMobileVideoHeight = () => {
  if (typeof window === 'undefined') return 'auto';

  // Calculate available height for video on mobile
  const viewportHeight = window.innerHeight;
  const headerHeight = 73; // Header with padding
  const progressHeight = 100; // Upload progress when visible
  const buttonsHeight = 60; // Submit buttons

  const availableHeight = viewportHeight - headerHeight - buttonsHeight - progressHeight;
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
  const [pcIframeVideoHeight, setPcIframeVideoHeight] = useState<string | undefined>(undefined);
  const [isNavigatingToHistory, setIsNavigatingToHistory] = useState(false);
  const [isInCsmList, setIsInCsmList] = useState(false);
  const [csmName, setCsmName] = useState('');
  const [isGettingCsmList, setIsGettingCsmList] = useState(false);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const retrieveCSM = useCallback(async () => {
    try {
      const webhookurl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_CSM_LIST;
      if (!webhookurl) {
        console.error("Make.com webhook URL not configured");
        return;
      }
      setIsGettingCsmList(true)
      const response = await fetch(webhookurl);
      const data = await response.json();
      if (data && formData?.email) {
        const result = data.filter(
          (e: { '✍️ Email': string; '🚫 Full Name': string }) => e['✍️ Email'] == formData.email
        );
        setIsInCsmList(result.length > 0);
        if (result.length > 0) {
          console.log(result);
          setCsmName(result[0]['🚫 Full Name'])
        }
      }
    } catch (error) {
      console.error("Error fetching coaches:", error);
    } finally {
      setIsGettingCsmList(false)
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

  // Set PC iframe video height if embedded via iframe and on PC
  useEffect(() => {

    if (isInIframe && !isMobile) {
      setPcIframeVideoHeight('400px');
    } else {
      setPcIframeVideoHeight(undefined);
    }
  }, []);

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
    router.push("/thanks");

    // Clear data after navigation has started
    setTimeout(() => {
      resetFormExceptEmail();
    }, 100);
  };

  // Cleanup on component mount and unmount
  useEffect(() => {
    cleanupMediaStreams();
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
        { ...formData, ...recordedData, duration: recordedData.duration / 60 },
        isInCsmList,
        csmName,
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

  useEffect(() => {
    stopAllMediaTracks();
  }, []);

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

  // When creating the video URL and download link, use the correct extension and type
  const url = recordedData?.videoBlob ? URL.createObjectURL(recordedData.videoBlob) : undefined;
  const extension = recordedData?.mimeType?.includes('mp4') ? 'mp4' : 'webm';

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="md:p-4 p-0 border-b">
        <div className="w-full relative flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0"
            onClick={handleBack}
            disabled={isSubmitting || isVideoLoading}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center">
            <h1 className="text-lg font-medium">Review Your Recording</h1>
            {/* Video info - Fixed height */}
            {!isVideoLoading && !videoLoadError && (
              <div className="">
                {recordedData.duration ? `${formatTime(recordedData.duration)}` : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={cn(
        "flex-1 flex flex-col container m-auto py-4 overflow-hidden",
        isMobile ? "px-4 max-w-full" : "max-w-5xl"
      )}>

        {/* Video player with loading overlay - Height constrained on mobile */}
        <div className={cn(
          "relative bg-black rounded-xl overflow-hidden md:mb-6 mb-3 flex-shrink-0 flex justify-center",
          isMobile ? "w-full" : "flex-1"
        )}
          style={
            isInIframe && !isMobile
              ? { height: '400px' }
              : isMobile
                ? { height: mobileVideoHeight }
                : undefined
          }
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
            className="object-contain"
            style={
              isInIframe && !isMobile
                ? { height: '400px', width: '640px' }
                : isMobile
                  ? { width: '100%', height: '100%', objectFit: 'contain', opacity: isVideoLoading ? 0.3 : 1 }
                  : { width: '100%', height: '100%', objectFit: 'contain', opacity: isVideoLoading ? 0.3 : 1 }
            }
          >
            {url && (
              <source src={url} type={recordedData?.mimeType || 'video/webm'} />
            )}
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Upload Progress - Scrollable if needed on mobile */}
        {(isSubmitting || hasFailedUploads || hasAnySuccess) && (
          <div className={cn(
            "md:mb-6 mb-3 md:p-4 p-2 bg-gray-50 rounded-lg border",
            isMobile ? "flex-shrink-0 max-h-48 overflow-y-auto" : "flex-shrink-0"
          )}>
            {/* Combined Progress Status */}
            {(() => {
              // Calculate combined progress and status
              const gd = uploadProgress.googleDrive;
              const wh = uploadProgress.webhook;
              let combinedStatus: 'pending' | 'uploading' | 'completed' | 'failed' = 'pending';
              let combinedProgress = 0;
              let statusText = '';

              if (gd?.status === 'failed' || wh?.status === 'failed') {
                combinedStatus = 'failed';
                statusText = '';
              } else if (gd?.status === 'uploading') {
                combinedStatus = 'uploading';
                // Google Drive uploading: 0-50%
                combinedProgress = gd.progress ? gd.progress * 0.5 : 0;
                statusText = `Uploading to Google Drive... ${gd.progress || 0}%`;
              } else if (gd?.status === 'completed' && wh?.status === 'uploading') {
                combinedStatus = 'uploading';
                // Form submitting: 50-100%
                combinedProgress = 50;
                statusText = 'Submitting form...';
              } else if (gd?.status === 'completed' && wh?.status === 'completed') {
                combinedStatus = 'completed';
                combinedProgress = 100;
                statusText = 'Submission Complete';
              } else if (gd?.status === 'completed') {
                combinedStatus = 'uploading';
                combinedProgress = 50;
                statusText = 'Preparing form submission...';
              } else {
                combinedStatus = 'pending';
                combinedProgress = 0;
                statusText = 'Waiting to start...';
              }

              // Show icon based on combined status
              const icon = getUploadStatusIcon(combinedStatus);

              // Download handler for failed uploads
              const handleDownload = () => {
                if (!recordedData?.videoBlob) return;
                const url = URL.createObjectURL(recordedData.videoBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recording.${extension}`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 100);
              };

              return (
                <>
                  {/* Status Row */}
                  {/* <div className="flex items-center gap-2">
                      {icon}
                      <span className="text-sm">Overall Submission</span>
                    </div> */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {statusText}
                    </span>
                    {combinedStatus === 'uploading' && (
                      <span className="text-xs text-gray-500 mt-1">
                        {combinedProgress > 0 ? `${Math.round(combinedProgress)}%` : ''}
                      </span>
                    )}
                  </div>
                  {/* Progress Bar Row */}
                  {(combinedStatus === 'uploading' || combinedStatus === 'pending') && (
                    <div className="mb-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${combinedProgress}%` }}
                          className="h-full bg-primary transition-all"
                        />
                      </div>

                    </div>
                  )}
                  {/* Error Messages */}
                  {(gd?.error || wh?.error) && (
                    <div className="mt-2 text-xs text-orange-600">
                      {gd?.error && <div>Google Drive: {gd.error}</div>}
                      {wh?.error && <div>Form: {wh.error}</div>}
                    </div>
                  )}
                  {showRetryButton && !isSubmitting && (
                    <div className="md:flex hidden md:mx-auto mx-2 md:max-w-xs max-w-none pt-3 border-gray-200 gap-3 items-center justify-center">
                      {url && (
                        <Button size="lg" variant='outline' className="flex justify-center items-center gap-3">
                          <Download className="w-5 h-5" />
                          <a href={url} download={`recording.${extension}`} className="flex justify-center items-center gap-3">
                            Download Video
                          </a>
                        </Button>
                      )}
                      <Button
                        size="lg"
                        onClick={handleRetry}
                        disabled={isSubmitting || isGettingCsmList}
                        className="md:w-auto w-full"
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
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
        {/* Download Reminder and Retry Button on Failure */}
        {showRetryButton && !isSubmitting && (
          <Button variant='outline' className="md:hidden md:mx-auto mb-2 md:max-w-xs max-w-none t-3 border-gray-200 flex flex-col gap-3 items-center">
            {url && (
              <div className="flex justify-center items-center gap-3">
                <Download />
                <a href={url} download={`recording.${extension}`}>
                  Download Video
                </a>
              </div>
            )}
          </Button>
        )}
        {/* Submit button - Fixed at bottom */}
        <div className="flex justify-end gap-4 md:p-0">
          {!submissionComplete && !showRetryButton && !isSubmitting && (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={isVideoLoading || Boolean(videoLoadError) || isGettingCsmList}
              className="px-8 md:w-auto w-full"
            >
              <Send className="mr-2 h-5 w-5" />
              {isGettingCsmList ? 'Loading your CRM info...' : 'Recording'}
            </Button>
          )}
          {!submissionComplete && showRetryButton && !isSubmitting && (
            <Button
              size="lg"
              onClick={handleRetry}
              disabled={isGettingCsmList}
              className="px-8 md:w-auto w-full md:hidden flex"
              variant="default"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              {isGettingCsmList ? 'Loading your CRM info...' : 'Recording'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}