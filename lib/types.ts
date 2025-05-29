export type FormData = {
  email: string;
  prompt: string;
  assessmentType: AssessmentType;
  submissionType: SubmissionType;
  notes?: string;
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