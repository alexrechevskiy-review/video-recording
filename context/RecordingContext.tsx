"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AssessmentType, FormData, RecordedData, SubmissionType } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

type RecordingContextType = {
  formData: FormData | null;
  recordedData: RecordedData | null;
  setFormData: (data: FormData) => void;
  setRecordedData: (data: RecordedData) => void;
  resetData: () => void;
  clearRecordedData: () => void;
};

const RecordingContext = createContext<RecordingContextType & { resetFormExceptEmail: () => void }>({
  formData: null,
  recordedData: null,
  setFormData: () => { },
  setRecordedData: () => { },
  resetData: () => { },
  clearRecordedData: () => { },
  resetFormExceptEmail: () => { },
});

export const RecordingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const query = useSearchParams();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [recordedData, setRecordedData] = useState<RecordedData | null>(null);
  const email = query.get("email");

  useEffect(() => {
    if (email) {
      setFormData({ email: email || "", prompt: "", assessmentType: AssessmentType.BEHAVIORAL, submissionType: SubmissionType.LOOM });
    }
  }, [email]);

  const resetData = () => {
    setFormData(null);
    setRecordedData(null);
  };

  const clearRecordedData = () => {
    setRecordedData(null);
  };

  const resetFormExceptEmail = () => {
    setFormData((prev) => {
      if (!prev || !prev.email) return { email: "", prompt: "", assessmentType: AssessmentType.BEHAVIORAL, submissionType: SubmissionType.LOOM };
      return { email: prev.email, prompt: "", assessmentType: AssessmentType.BEHAVIORAL, submissionType: SubmissionType.LOOM };
    });
    setRecordedData(null);
  };

  const value = {
    formData,
    setFormData,
    recordedData,
    setRecordedData,
    clearRecordedData,
    resetData,
    resetFormExceptEmail,
  };

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  );
};

export const useRecording = () => useContext(RecordingContext);