export type FormData = {
  email: string;
  name: string;
  prompt: string;
  assessmentType: AssessmentType;
  submissionType: SubmissionType;
  notes?: string;
  coachToReview?: string[];
};

export enum AssessmentType {
  BEHAVIORAL = "Behavioral",
  PRODUCT_DESIGN = "Product Design/ Sense",
  ANALYTICAL = "Analytical & Execution",
  STRATEGY = "Strategy",
  CASE_STUDY = "Case Study"
}

export enum SubmissionType {
  LOOM = "Loom Baseline Assessment",
  MASTERCLASS = "Masterclass Assignment",
  REVIEW = "Review",
  WRITEUP = "Write up Assignment",
  COMPANY = "Company Assignment"
}

export type RecordingSettings = {
  cameraEnabled: boolean;
  microphoneEnabled: boolean;
  screenShareEnabled: boolean;
};

export type RecordedData = {
  videoBlob?: Blob;
  duration: number;
};

// Add new types for submission history
export type SubmissionRecord = {
  id: string;
  Email: string;
  Status: string;
  'Submission link': string | null;
  'Coach\'s Feedback': string;
  createdTime: string;
};

export type SubmissionHistoryResponse = {
  submissions: SubmissionRecord[];
  total: number;
};