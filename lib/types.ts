export type FormData = {
  email: string;
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
  LOOM = "Baseline Assessment",
  MASTERCLASS = "Masterclass Assignment",
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
  'Len of Video (min)': string;
  'Interview Prompt': string;
  'Type of Submission': string;
  'Submission Time': string;
  'Proficiency score Numeric': number;
  'Interview Type': string;
  '🤖✍️ Date Reviewed': Date;
  'Feedback Report Google Doc (Sharable)': string;
  'Proficiency Score (Hire Rubric)': string;
};

export type SubmissionHistoryResponse = {
  submissions: SubmissionRecord[];
  total: number;
};