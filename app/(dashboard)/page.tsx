import React from "react";
import AssessmentForm from "@/components/form/assessment-form";

export default function FormPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Interview Submission</h1>
          <p className="text-muted-foreground">
            Complete the form below to set up your interview recording
          </p>
        </div>
        
        <div className="bg-card shadow-sm border rounded-xl overflow-hidden">
          <AssessmentForm />
        </div>
      </div>
    </main>
  );
}