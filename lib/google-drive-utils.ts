"use client";

interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

interface ChunkUploadResult {
    success: boolean;
    complete?: boolean;
    error?: string;
    retryAfter?: number;
    range?: string;
    fileId?: string;
}

interface UploadSession {
    sessionUri: string;
    uploadId: string;
    uploadedBytes: number;
    totalSize: number;
}

export class GoogleDriveUploader {
    private readonly CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    private readonly MAX_RETRIES = 5;
    private readonly RETRY_DELAY_BASE = 1000; // 1 second base delay
    private currentSession: UploadSession | null = null;

    constructor() { }

    /**
     * Upload video to Google Drive with chunking and retry logic
     */
    async uploadVideo(
        videoBlob: Blob,
        filename: string,
        userEmail: string,
        isInCsmList: boolean,
        csmName: string,
        onProgress?: (progress: UploadProgress) => void,
        onError?: (error: string) => void,
        resumeSession?: UploadSession
    ): Promise<string> {
        try {
            // Use existing session or create new one
            if (resumeSession) {
                this.currentSession = resumeSession;
                if (onError) {
                    onError(`Checking upload status...`);
                }

                // Verify session is still valid
                const actualUploadedBytes = await this.checkUploadStatus(resumeSession.sessionUri);
                if (actualUploadedBytes === null) {
                    // Session expired, create new one
                    if (onError) {
                        onError(`Previous session expired. Starting fresh upload...`);
                    }
                    const { sessionUri, uploadId } = await this.initiateResumableUpload(
                        filename,
                        videoBlob.size,
                        userEmail,
                        isInCsmList,
                        csmName
                    );

                    this.currentSession = {
                        sessionUri,
                        uploadId,
                        uploadedBytes: 0,
                        totalSize: videoBlob.size
                    };
                } else {
                    // Update with actual progress
                    this.currentSession.uploadedBytes = actualUploadedBytes;
                    if (onError) {
                        onError(`Resuming upload from ${Math.round((actualUploadedBytes / resumeSession.totalSize) * 100)}%...`);
                    }
                }
            } else {
                // Initiate new resumable upload session
                const { sessionUri, uploadId } = await this.initiateResumableUpload(
                    filename,
                    videoBlob.size,
                    userEmail,
                    isInCsmList,
                    csmName
                );

                this.currentSession = {
                    sessionUri,
                    uploadId,
                    uploadedBytes: 0,
                    totalSize: videoBlob.size
                };
            }

            // Upload file in chunks starting from where we left off
            const fileId = await this.uploadInChunks(
                videoBlob,
                onProgress,
                onError
            );

            // Clear session on success
            this.currentSession = null;
            return fileId;
        } catch (error) {
            console.error('Error uploading to Google Drive:', error);

            // Don't clear session on error so we can resume (unless it's a session error)
            if (error instanceof Error && error.message.includes('session')) {
                this.currentSession = null;
            }

            // Provide more specific error messages
            if (error instanceof Error) {
                if (error.message.includes('Failed to initiate upload')) {
                    throw new Error('Failed to start Google Drive upload. Please check your internet connection and try again.');
                } else if (error.message.includes('Failed to upload chunk')) {
                    throw new Error('Upload was interrupted. Click retry to resume from where it left off.');
                } else if (error.message.includes('Failed to finalize upload')) {
                    throw new Error('Upload completed but failed to finalize. Please try again.');
                }
            }

            throw error;
        }
    }

    /**
     * Get current upload session for resuming
     */
    getCurrentSession(): UploadSession | null {
        return this.currentSession;
    }

    /**
     * Clear current session (call this when starting fresh)
     */
    clearSession(): void {
        this.currentSession = null;
    }

    /**
     * Check upload status and get uploaded range
     * Returns null if session is expired/invalid
     */
    private async checkUploadStatus(sessionUri: string): Promise<number | null> {
        try {
            const response = await fetch('/api/google-drive/check-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionUri }),
            });

            if (response.ok) {
                const result = await response.json();
                if (result.sessionExpired) {
                    return null; // Session expired
                }
                return result.uploadedBytes || 0;
            }

            return null; // Assume session expired on error
        } catch (error) {
            console.warn('Failed to check upload status:', error);
            return null; // Assume session expired on error
        }
    }

    /**
     * Initiate resumable upload session via backend
     */
    private async initiateResumableUpload(
        filename: string,
        fileSize: number,
        userEmail: string,
        isInCsmList: boolean,
        csmName: string
    ): Promise<{ sessionUri: string; uploadId: string }> {
        const response = await fetch('/api/google-drive/initiate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: filename,
                mimeType: 'video/webm',
                fileSize: fileSize,
                userEmail: userEmail,
                isInCsmList: isInCsmList,
                csmName: csmName
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to initiate upload: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();

        if (!data.sessionUri) {
            throw new Error('No session URI received from server');
        }

        return data;
    }

    /**
     * Upload file in chunks with retry logic, starting from current position
     */
    private async uploadInChunks(
        videoBlob: Blob,
        onProgress?: (progress: UploadProgress) => void,
        onError?: (error: string) => void
    ): Promise<string> {
        if (!this.currentSession) {
            throw new Error('No upload session available');
        }

        const { sessionUri, totalSize } = this.currentSession;
        let uploadedBytes = this.currentSession.uploadedBytes;

        while (uploadedBytes < totalSize) {
            const chunkStart = uploadedBytes;
            const chunkEnd = Math.min(chunkStart + this.CHUNK_SIZE - 1, totalSize - 1);
            const chunk = videoBlob.slice(chunkStart, chunkEnd + 1);

            let chunkUploaded = false;
            let retryCount = 0;
            let fileId: string | undefined;

            while (!chunkUploaded && retryCount < this.MAX_RETRIES) {
                try {
                    const result = await this.uploadChunk(sessionUri, chunk, chunkStart, chunkEnd, totalSize);

                    if (result.success) {
                        if (result.complete && result.fileId) {
                            // Upload completed
                            return result.fileId;
                        } else {
                            // Chunk uploaded successfully
                            chunkUploaded = true;
                            uploadedBytes = chunkEnd + 1;

                            // Update session progress
                            this.currentSession.uploadedBytes = uploadedBytes;

                            // Check if upload is complete
                            if (result.fileId) {
                                fileId = result.fileId;
                            }

                            // Report progress
                            if (onProgress) {
                                onProgress({
                                    loaded: uploadedBytes,
                                    total: totalSize,
                                    percentage: Math.round((uploadedBytes / totalSize) * 100),
                                });
                            }
                        }
                    } else {
                        retryCount++;
                        const delay = this.calculateRetryDelay(retryCount, result.retryAfter);

                        if (onError) {
                            onError(`Chunk upload failed (attempt ${retryCount}/${this.MAX_RETRIES}): ${result.error}. Retrying in ${Math.round(delay / 1000)}s...`);
                        }

                        if (retryCount < this.MAX_RETRIES) {
                            await this.sleep(delay);
                        }
                    }
                } catch (error) {
                    retryCount++;
                    const delay = this.calculateRetryDelay(retryCount);

                    if (onError) {
                        onError(`Chunk upload error (attempt ${retryCount}/${this.MAX_RETRIES}): ${error instanceof Error ? error.message : 'Unknown error'}. Retrying in ${Math.round(delay / 1000)}s...`);
                    }

                    if (retryCount < this.MAX_RETRIES) {
                        await this.sleep(delay);
                    }
                }
            }

            if (!chunkUploaded) {
                // Save current progress before throwing error
                this.currentSession.uploadedBytes = uploadedBytes;
                throw new Error(`Failed to upload chunk after ${this.MAX_RETRIES} attempts. Progress saved at ${Math.round((uploadedBytes / totalSize) * 100)}%.`);
            }

            // If we got a fileId, we're done
            if (fileId) {
                return fileId;
            }
        }

        // If we reach here, finalize the upload
        return await this.finalizeUpload(sessionUri, totalSize);
    }

    /**
     * Upload a single chunk via backend
     */
    private async uploadChunk(
        sessionUri: string,
        chunk: Blob,
        start: number,
        end: number,
        total: number
    ): Promise<ChunkUploadResult> {
        try {
            const params = new URLSearchParams({
                sessionUri: sessionUri,
                start: start.toString(),
                end: end.toString(),
                total: total.toString(),
            });

            const response = await fetch(`/api/google-drive/upload-chunk?${params}`, {
                method: 'PUT',
                body: chunk,
            });

            if (response.ok) {
                const result = await response.json();
                return result;
            } else {
                const errorData = await response.json().catch(() => ({}));
                return {
                    success: false,
                    error: errorData.error || `HTTP ${response.status}`,
                    retryAfter: errorData.retryAfter,
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Network error',
            };
        }
    }

    /**
     * Finalize upload via backend
     */
    private async finalizeUpload(sessionUri: string, totalSize: number): Promise<string> {
        const response = await fetch('/api/google-drive/finalize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionUri: sessionUri,
                totalSize: totalSize,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to finalize upload: ${errorData.error || response.statusText}`);
        }

        const result = await response.json();

        if (!result.fileId) {
            throw new Error('No file ID received from finalization');
        }

        return result.fileId;
    }

    /**
     * Calculate retry delay with exponential backoff
     */
    private calculateRetryDelay(retryCount: number, retryAfter?: number): number {
        if (retryAfter) {
            return retryAfter;
        }
        return Math.min(this.RETRY_DELAY_BASE * Math.pow(2, retryCount - 1), 30000); // Max 30 seconds
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
} 