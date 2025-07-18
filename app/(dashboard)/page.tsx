'use client';
import React from "react";
import AssessmentForm from "@/components/form/assessment-form";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";

export default function FormPage() {
  const router = useRouter();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="container flex items-center justify-center">
            <h1 className="text-3xl text-center font-bold tracking-tight mb-2">Your Practice Video</h1>
          </div>
          <p className="text-muted-foreground">
            Complete the steps below to submit your interview recording
          </p>
        </div>

        <div className="bg-card md:shadow-sm shadow-none md:border rounded-xl overflow-hidden">
          <AssessmentForm />
        </div>
      </div>
    </main>
  );
}