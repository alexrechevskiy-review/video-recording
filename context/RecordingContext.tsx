"use client";

import React, { createContext, useContext, useState } from 'react';
import { FormData, RecordedData } from '@/lib/types';

type RecordingContextType = {
  formData: FormData | null;
  recordedData: RecordedData | null;
  setFormData: (data: FormData) => void;
  setRecordedData: (data: RecordedData) => void;
  resetData: () => void;
};

const initialFormData: FormData | null = null;
const initialRecordedData: RecordedData | null = null;

const RecordingContext = createContext<RecordingContextType>({
  formData: initialFormData,
  recordedData: initialRecordedData,
  setFormData: () => {},
  setRecordedData: () => {},
  resetData: () => {},
});

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [formData, setFormData] = useState<FormData | null>(initialFormData);
  const [recordedData, setRecordedData] = useState<RecordedData | null>(initialRecordedData);

  const resetData = () => {
    setFormData(null);
    setRecordedData(null);
  };

  return (
    <RecordingContext.Provider
      value={{
        formData,
        recordedData,
        setFormData,
        setRecordedData,
        resetData,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export const useRecording = () => useContext(RecordingContext);