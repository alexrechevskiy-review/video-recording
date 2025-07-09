"use client";

import React, { useState, useEffect } from "react";
import { useSubmissionHistory } from "@/hooks/use-submission-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, FileText, ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useRecording } from "@/context/RecordingContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialogContent } from "@/components/ui/alert-dialog";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, feedback }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Coach&apos;s Feedback</DialogTitle>
          <DialogDescription className="pt-4 max-h-[80vh] overflow-y-auto">
            {feedback || "No feedback available."}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default function HistoryPage() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState(""); // This controls when the query runs
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState("");
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { formData, clearRecordedData } = useRecording();

  const { data, isLoading, error, refetch } = useSubmissionHistory(searchEmail);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter an email address to search for submissions.",
      });
      return;
    }
    setSearchEmail(email.trim());
    setHasSearched(true);
  };

  useEffect(() => {
    if (formData?.email) {
      setEmail(formData.email);
      setSearchEmail(formData.email)
      setHasSearched(true);
    }
  }, [formData?.email]);

  const handleBack = () => {
    router.push("/");
  };

  // Clear all data when entering history page
  useEffect(() => {
    clearRecordedData();
  }, [clearRecordedData]);

  return (
    <main className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8 w-full flex flex-col md:flex-row items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Video Submission Portal</h1>
        <Button
          onClick={handleBack}
          variant="outline"
          className="md:block hidden"
        >
          Record another video
        </Button>
      </div>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-xl font-medium mb-2">Submission Complete!</h3>
        <p className="text-gray-600 mb-4">Your video has been uploaded successfully and will be reviewed soon.</p>
        <Button
          onClick={handleBack}
          variant="secondary"
        >
          Record another video
        </Button>
      </div>
      {/* Search Form */}
      <Card className="my-8 hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Your Previous Submissions
          </CardTitle>
          <CardDescription>
            Enter an email address to view submission history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="email" className="sr-only">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </form>
          <p className="text-sm text-muted-foreground mt-2">
            Test: nidhig318@gmail.com
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {
        error && hasSearched && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                <p className="font-medium">Error loading submissions</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {error instanceof Error ? error.message : "An unexpected error occurred"}
                </p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      }

      {
        data && hasSearched && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Submissions for {searchEmail}
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {data.total || data.submissions?.length || 0} total submission{(data.total || data.submissions?.length || 0) !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!data.submissions || data.submissions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No submissions found</p>
                  <p className="text-muted-foreground">
                    No interview submissions were found for this email address.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submission Link</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.submissions.map((submission, index) => (
                        <TableRow key={submission.id || index}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {submission.id}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {submission.Status}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px] overflow-hidden">
                            <div className="flex items-center gap-2 w-full">
                              {submission['Submission link']}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {new Date(submission.createdTime).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedFeedback(submission['Coach\'s Feedback'] || '');
                                setIsFeedbackModalOpen(true);
                              }}
                            >
                              View Feedback
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      }

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        feedback={selectedFeedback}
      />
    </main>
  );
}