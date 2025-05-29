"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useRecording } from "@/context/RecordingContext";
import { AssessmentType, SubmissionType } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroupCards } from "@/components/ui/radio-group-cards";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  prompt: z.string().min(3, "Please enter your interview prompt"),
  assessmentType: z.nativeEnum(AssessmentType),
  submissionType: z.nativeEnum(SubmissionType),
  notes: z.string().optional(),
});

export default function AssessmentForm() {
  const router = useRouter();
  const { setFormData } = useRecording();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assessmentType: AssessmentType.BEHAVIORAL,
      submissionType: SubmissionType.LOOM,
    },
  });

  const assessmentType = watch("assessmentType");
  const submissionType = watch("submissionType");

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setFormData(data);
    router.push("/record");
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 md:p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-3">
          <Label htmlFor="email" className="text-base">
            Enrollment Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="your.email@example.com"
            className="w-full"
          />
          {errors.email && (
            <p className="text-destructive text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="prompt" className="text-base">
            Interview Prompt: What is your submission responding to? <span className="text-destructive">*</span>
          </Label>
          <p className="text-muted-foreground text-sm">eg "Tell me about yourself" or "Design Uber for people 65 and older"</p>
          <Textarea
            id="prompt"
            {...register("prompt")}
            placeholder="Enter your interview prompt"
            className="w-full min-h-[120px]"
          />
          {errors.prompt && (
            <p className="text-destructive text-sm mt-1">{errors.prompt.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-base">
            Interview Assessment Type <span className="text-destructive">*</span>
          </Label>
          <RadioGroupCards
            value={assessmentType}
            onChange={(value) => setValue("assessmentType", value as AssessmentType)}
            items={[
              { value: AssessmentType.BEHAVIORAL, label: "Behavioral" },
              { value: AssessmentType.PRODUCT_DESIGN, label: "Product Design/ Sense" },
              { value: AssessmentType.ANALYTICAL, label: "Analytical & Execution" },
              { value: AssessmentType.STRATEGY, label: "Strategy" },
              { value: AssessmentType.CASE_STUDY, label: "Case Study" },
            ]}
            orientation="horizontal"
          />
          {errors.assessmentType && (
            <p className="text-destructive text-sm">{errors.assessmentType.message}</p>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-base">
            Type of Submission <span className="text-destructive">*</span>
          </Label>
          <RadioGroupCards
            value={submissionType}
            onChange={(value) => setValue("submissionType", value as SubmissionType)}
            items={[
              { value: SubmissionType.LOOM, label: "Loom Baseline Assessment" },
              { value: SubmissionType.MASTERCLASS, label: "Masterclass Assignment" },
              { value: SubmissionType.REVIEW, label: "Review" },
              { value: SubmissionType.WRITEUP, label: "Write up Assignment" },
              { value: SubmissionType.COMPANY, label: "Company Assignment" },
            ]}
          />
          {errors.submissionType && (
            <p className="text-destructive text-sm">{errors.submissionType.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label htmlFor="notes" className="text-base">
            Members Note
          </Label>
          <p className="text-muted-foreground text-sm">Anything else you want to share about your submission?</p>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Add any additional notes (optional)"
            className="w-full"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button 
            type="submit" 
            size="lg"
            disabled={isSubmitting}
            className="px-8 transition-all duration-300"
          >
            Continue to Recording
          </Button>
        </div>
      </form>
    </div>
  );
}