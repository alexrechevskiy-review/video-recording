"use client";

import React, { useState, useEffect } from "react";
import { useSubmissionHistory } from "@/hooks/use-submission-history";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Search, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useRecording } from "@/context/RecordingContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { stopAllMediaTracks } from "@/lib/recording-utils";
import { differenceInDays } from 'date-fns';
import Link from "next/link";

// 1. Update FeedbackModalProps to accept structured feedback
interface StructuredFeedback {
  title: string;
  date: string;
  summary: string;
  points: string[];
}

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: StructuredFeedback | null;
  selectedSubmission: any
}

// 2. Helper to parse feedback string into structured blocks (headings, bold, paragraphs)

type FeedbackBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; content: (string | { type: 'bold'; text: string })[] };

function parseFeedbackBlocks(feedback: string, title: string, date: string): StructuredFeedback & { blocks: FeedbackBlock[] } {
  if (!feedback) {
    return {
      title,
      date,
      summary: 'No feedback available.',
      points: [],
      blocks: [],
    };
  }
  const lines = feedback.split(/\r?\n/).map(l => l.trim());
  const blocks: FeedbackBlock[] = [];
  let paragraph: (string | { type: 'bold'; text: string })[] = [];

  function pushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraph });
      paragraph = [];
    }
  }

  for (const line of lines) {
    if (!line) {
      pushParagraph();
      continue;
    }
    if (line.startsWith('###')) {
      pushParagraph();
      let text = line.replace(/^###\s*/, '');
      // Remove leading/trailing ** for headings
      text = text.replace(/^\*\*/, '').replace(/\*\*$/, '');
      blocks.push({ type: 'heading', level: 3, text });
    } else if (line.startsWith('##')) {
      pushParagraph();
      let text = line.replace(/^##\s*/, '');
      text = text.replace(/^\*\*/, '').replace(/\*\*$/, '');
      blocks.push({ type: 'heading', level: 2, text });
    } else if (line.startsWith('#')) {
      pushParagraph();
      let text = line.replace(/^#\s*/, '');
      text = text.replace(/^\*\*/, '').replace(/\*\*$/, '');
      blocks.push({ type: 'heading', level: 1, text });
    } else {
      // Parse bold (**text**)
      const parts: (string | { type: 'bold'; text: string })[] = [];
      let rest = line;
      while (rest.includes('**')) {
        const start = rest.indexOf('**');
        if (start > 0) {
          parts.push(rest.slice(0, start));
        }
        const end = rest.indexOf('**', start + 2);
        if (end > start + 2) {
          parts.push({ type: 'bold', text: rest.slice(start + 2, end) });
          rest = rest.slice(end + 2);
        } else {
          // unmatched **, treat as normal text
          parts.push(rest);
          rest = '';
        }
      }
      if (rest) parts.push(rest);
      paragraph.push(...parts);
    }
  }
  pushParagraph();

  // For compatibility, keep summary/points as before (optional)
  return {
    title,
    date,
    summary: '',
    points: [],
    blocks,
  };
}

// 3. Update FeedbackModal to render blocks with headings and bold
const FeedbackModal: React.FC<FeedbackModalProps & { feedback?: StructuredFeedback & { blocks?: FeedbackBlock[] } }> = ({ isOpen, onClose, feedback, selectedSubmission }) => {
  // Extract elements from content which text is " " or "- "
  function extractFilteredContent(content: (string | { type: 'bold'; text: string })[]) {
    return content.filter(
      (part) =>
        (typeof part === "string" && part.trim() !== "" && part.trim() !== "-") ||
        (typeof part === "object")
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Coach Feedback</DialogTitle>
        </DialogHeader>
        {feedback ? (
          <div className="mt-2">
            <div className="font-semibold text-xl mb-1">{feedback.title}</div>
            <div className="text-sm text-muted-foreground mb-4">Feedback provided on {feedback.date}</div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg max-h-[45vh] p-4 overflow-y-auto">
              {
                selectedSubmission['Feedback Report Google Doc (Sharable)'] && 
                <Link className="underline text-right text-sm w-full" href={selectedSubmission['Feedback Report Google Doc (Sharable)']}>
                <p>View Google Doc</p>
              </Link>
              }
              {feedback.blocks && feedback.blocks.length > 0 ? (
                <div className="space-y-3">
                  {feedback.blocks.map((block, idx) => {
                    if (block.type === 'heading') {
                      if (block.level === 1) {
                        return <h2 key={idx} className="text-lg font-bold mt-4 mb-2">{block.text}</h2>;
                      } else if (block.level === 2) {
                        return <h3 key={idx} className="font-semibold mt-3 mb-1">{block.text}</h3>;
                      } else {
                        return <h4 key={idx} className="font-medium mt-2 mb-1">{block.text}</h4>;
                      }
                    } else if (block.type === 'paragraph') {
                      // Only render elements from content which text is " " or "- "
                      const filteredContent = extractFilteredContent(block.content);
                      return (
                        <ul key={`${idx}-ul`} className="text-base leading-relaxed list-disc ml-6">
                          {filteredContent.map((part, i) =>
                              typeof part === "string"
                                ? <>{part}<br/><br/></>
                                : <li key={`${i}-${idx}`} className="font-semibold">{part.text}</li>
                            )
                          }
                        </ul>
                      );
                    }
                    return null;
                  })}
                </div>
              ) : (
                <div>No feedback available.</div>
              )}
            </div>
            <div className="mt-4">Proficiency Score (Hire Rubric) : {selectedSubmission['Proficiency Score (Hire Rubric)'] ? selectedSubmission['Proficiency Score (Hire Rubric)'] : ''}</div>
          </div>
        ) : (
          <div>No feedback available.</div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default function HistoryPage() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState(""); // This controls when the query runs
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<StructuredFeedback | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
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

  useEffect(() => {
    stopAllMediaTracks();
  }, []);

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
                  {data.submissions.map((submission, index) => (
                    <div key={submission.id || index} className="p-4 flex justify-between items-center border rounded-lg bg-card text-card-foreground shadow-sm mt-4">
                      <Link href={submission['Submission link'] ?? ''} target="_blank" className="flex gap-2 flex-col">
                        <h4 className="font-medium">
                          {submission['Interview Prompt']
                            ? submission['Interview Prompt'].length > 100
                              ? submission['Interview Prompt'].slice(0, 100) + ' ...'
                              : submission['Interview Prompt']
                            : 'Interview Prompt'}
                        </h4>
                        <div className="text-sm text-gray-500">
                          <span>
                            Submitted&nbsp;
                            {(() => {
                              const now = new Date();
                              const created = new Date(submission['Submission Time']);
                              const diffDays = differenceInDays(now, created);
                              if (diffDays === 0) {
                                const diffMs = now.getTime() - created.getTime();
                                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                                if (diffHours >= 1) {
                                  return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
                                } else {
                                  return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
                                }
                              } else if (diffDays === 1) {
                                return '1 day ago';
                              } else {
                                return `${diffDays} days ago`;
                              }
                            })()}
                          </span>
                          <span>
                            {submission['Len of Video (min)'] ? <>
                              <span className="mx-2">•</span>
                              {(() => {
                                const duration = parseFloat(submission['Len of Video (min)'] || "0");
                                const totalSeconds = Math.round(duration * 60);
                                const minutes = Math.floor(totalSeconds / 60);
                                const seconds = totalSeconds % 60;
                                return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                              })()}
                            </> : ''}
                          </span>
                          <span>
                            &nbsp;•&nbsp;{submission['Type of Submission']}
                          </span>
                        </div>
                      </Link>
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!(submission.Status === "Done" || submission["Coach's Feedback"] !== "")}
                          onClick={() => {
                            setSelectedFeedback(
                              parseFeedbackBlocks(
                                submission['Coach\'s Feedback'] || '',
                                submission['Interview Prompt'],
                                submission['🤖✍️ Date Reviewed'] ? new Date(submission['🤖✍️ Date Reviewed']).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : (submission['Submission Time'] ? new Date(submission['Submission Time']).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '')
                              )
                            );
                            setSelectedSubmission(submission)
                            setIsFeedbackModalOpen(true);
                          }}
                        >
                          <FileText />
                          View Feedback
                        </Button>
                        {submission['Proficiency score Numeric'] &&
                          <div>
                            Score: {submission['Proficiency score Numeric']}
                          </div>
                        }
                        <div>
                          {submission['Interview Type']}
                        </div>
                      </div>
                    </div>
                  ))}
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
        feedback={selectedFeedback as any}
        selectedSubmission={selectedSubmission}
      />
    </main>
  );
}