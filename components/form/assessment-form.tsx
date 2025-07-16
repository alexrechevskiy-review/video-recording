"use client";

import React, { useEffect } from "react";
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
import { MultiSelect } from "../ui/multi-select";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../ui/select";
import { Sub } from "@radix-ui/react-navigation-menu";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  prompt: z.string().min(3, "Please enter your interview prompt"),
  assessmentType: z.nativeEnum(AssessmentType),
  submissionType: z.nativeEnum(SubmissionType),
  coachToReview: z.string().min(1, "Please select a coach to review"),
  notes: z.string().optional(),
});

interface Coach {
  id: string;
  Name: string;
  Record_ID: string;
}

export default function AssessmentForm() {
  const router = useRouter();
  const { formData: formValues, setFormData } = useRecording();
  const [coaches, setCoaches] = React.useState<Coach[]>([]);

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
      coachToReview: 'recLQ0koHrbQLbnXp',
    },
  });
  

  useEffect(() => {
    retrieveCoach();
  }, []);

  useEffect(() => {
    if (formValues) {
      if (formValues.email) setValue("email", formValues.email);
      if (formValues.prompt) setValue("prompt", formValues.prompt);
      if (formValues.assessmentType) setValue("assessmentType", formValues.assessmentType);
      if (formValues.submissionType) setValue("submissionType", formValues.submissionType);
      if (formValues.coachToReview) setValue("coachToReview", Array.isArray(formValues.coachToReview) ? formValues.coachToReview[0] : formValues.coachToReview);
      if (formValues.notes) setValue("notes", formValues.notes);
    }
  }, [formValues, setValue]);


  const assessmentType = watch("assessmentType");
  const submissionType = watch("submissionType");
  const coachToReview = watch("coachToReview");
  const prompt = watch("prompt");
  const [customPrompt, setCustomPrompt] = React.useState("");
  const [selectedPromptOption, setSelectedPromptOption] = React.useState<string>("");

  // Keep prompt in sync with customPrompt if 'Other' is selected
  useEffect(() => {
    if (
      (assessmentType === AssessmentType.BEHAVIORAL && selectedPromptOption === "Other") ||
      (assessmentType === AssessmentType.PRODUCT_DESIGN && selectedPromptOption === "Other") ||
      (assessmentType === AssessmentType.ANALYTICAL && selectedPromptOption === "Other") ||
      (assessmentType === AssessmentType.STRATEGY && selectedPromptOption === "Other")
    ) {
      setValue("prompt", customPrompt);
    }
  }, [customPrompt, assessmentType, selectedPromptOption, setValue]);

  // Reset customPrompt when assessmentType changes
  useEffect(() => {
    setCustomPrompt("");
    if (
      assessmentType === AssessmentType.BEHAVIORAL ||
      assessmentType === AssessmentType.PRODUCT_DESIGN ||
      assessmentType === AssessmentType.ANALYTICAL ||
      assessmentType === AssessmentType.STRATEGY
    ) {
      const firstOption = promptOptions[assessmentType]?.[0];
      if (firstOption) {
        setSelectedPromptOption(firstOption.value);
        if (firstOption.value !== "Other") {
          setValue("prompt", firstOption.value);
        } else {
          setValue("prompt", "");
        }
      } else {
        setSelectedPromptOption("");
        setValue("prompt", "");
      }
    } else {
      setSelectedPromptOption("");
      setValue("prompt", "");
    }
  }, [assessmentType, setValue]);


  useEffect(() => {
    if (submissionType !== SubmissionType.LOOM) {
      setValue("coachToReview", "recLQ0koHrbQLbnXp");
    }
  }, [submissionType, setValue]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log("Form submitted with data:", data);

    // Set the form data in context
    setFormData({ ...data, coachToReview: [data.coachToReview] });

    // Small delay to ensure context is updated before navigation
    setTimeout(() => {
      router.push(`/record`);
    }, 50);
  };

  const retrieveCoach = async () => {
    try {
      const webhookurl = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_COACH_GET_URL;
      if (!webhookurl) {
        console.error("Make.com webhook URL not configured");
        return;
      }
      const response = await fetch(webhookurl);
      const data = await response.json();
      console.log("Coaches:", data);
      setCoaches(data);
    } catch (error) {
      console.error("Error fetching coaches:", error);
    }
  };

  // Prompt options for each assessment type
  const promptOptions = {
    [AssessmentType.BEHAVIORAL]: [
      { value: "Other", label: "Other (User enter’s their own prompt)" },
    ],
    [AssessmentType.PRODUCT_DESIGN]: [
      { value: "Design Uber for people 65 and older.", label: "Design Uber for people 65 and older." },
      { value: "Design an app to help people celebrate birthdays.", label: "Design an app to help people celebrate birthdays." },
      { value: "Design an educational product at Meta.", label: "Design an educational product at Meta." },
      { value: "Design a product for parking for Google Maps.", label: "Design a product for parking for Google Maps." },
      { value: "Other", label: "Other (User enter’s their own prompt)" },
    ],
    [AssessmentType.ANALYTICAL]: [
      { value: "Set goals and metrics for the Netflix homepage.", label: "Set goals and metrics for the Netflix homepage." },
      { value: "(Trade-offs) How would you decide between launching a highly requested feature vs. addressing a critical bug?", label: "(Trade-offs) How would you decide between launching a highly requested feature vs. addressing a critical bug?" },
      { value: "(RCA) You are PM at Google News. Usage is down 10%. What would you do?", label: "(RCA) You are PM at Google News. Usage is down 10%. What would you do?" },
      { value: "Set goals and metrics for FB Dating.", label: "Set goals and metrics for FB Dating." },
      { value: "Set goals and metrics for Zoom.", label: "Set goals and metrics for Zoom." },
      { value: "Other", label: "Other (User enter’s their own prompt)" },
    ],
    [AssessmentType.STRATEGY]: [
      { value: "How would you set up AirBnB for success over the next 5 years?", label: "How would you set up AirBnB for success over the next 5 years?" },
      { value: "Should Netflix create a podcast product?", label: "Should Netflix create a podcast product?" },
      { value: "How can Apple Maps regain market share?", label: "How can Apple Maps regain market share?" },
      { value: "Other", label: "Other (User enter’s their own prompt)" },
    ],
  };
  return (
    <div className="w-full max-w-3xl mx-auto p-2 md:p-8">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-3">
          <Label htmlFor="email" className="text-base">
            You're logged in with the following account <span className="text-destructive">*</span>
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


        <div className="space-y-3">
          <Label htmlFor="prompt" className="text-base">
            Interview Prompt: What is your submission responding to? <span className="text-destructive">*</span>
          </Label>
          <p className="text-muted-foreground text-sm">eg &quot;Tell me about yourself&quot; or &quot;Design Uber for people 65 and older&quot;</p>

          {/* Dynamic prompt field rendering */}
          {assessmentType === AssessmentType.CASE_STUDY ? (
            <Input
              id="prompt"
              {...register("prompt")}
              placeholder="Enter your interview prompt"
              className="w-full"
              maxLength={120}
            />
          ) : promptOptions[assessmentType] ? (
            <>
              <Select
                value={selectedPromptOption}
                onValueChange={value => {
                  setSelectedPromptOption(value);
                  if (value !== "Other") {
                    setValue("prompt", value);
                    setCustomPrompt("");
                  } else {
                    setCustomPrompt("");
                    setValue("prompt", "");
                  }
                }}
                name="promptDropdown"
              >
                <SelectTrigger className="min-h-[44px] w-full">
                  <SelectValue placeholder="Select a prompt" />
                </SelectTrigger>
                <SelectContent>
                  {promptOptions[assessmentType].map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPromptOption === "Other" && (
                <Textarea
                  id="prompt"
                  value={customPrompt}
                  onChange={e => {
                    setCustomPrompt(e.target.value);
                    setValue("prompt", e.target.value);
                  }}
                  placeholder="Enter your interview prompt"
                  className="w-full mt-2 min-h-[80px]"
                  maxLength={300}
                />
              )}
            </>
          ) : null}

          {errors.prompt && (
            <p className="text-destructive text-sm mt-1">{errors.prompt.message}</p>
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
              { value: SubmissionType.LOOM, label: "Baseline Assessment" },
              { value: SubmissionType.MASTERCLASS, label: "Masterclass Assignment" },
              { value: SubmissionType.COMPANY, label: "Company Assignment" },
            ]}
          />
          {errors.submissionType && (
            <p className="text-destructive text-sm">{errors.submissionType.message}</p>
          )}
        </div>
        {
          submissionType == SubmissionType.LOOM &&
          <div className="space-y-3">
            <Label className="text-base">
              Coach/Masterclass Host <span className="text-destructive">*</span>
            </Label>
            <p className="text-muted-foreground text-sm">
              Add the name of the Coach who hosted the session, otherwise default to Serges
            </p>

            <Select
              value={coachToReview}
              onValueChange={(value) => setValue("coachToReview", value)}
              name="coachToReview"
            >
              <SelectTrigger className="min-h-[44px] w-full">
                <SelectValue placeholder="Select a coach" />
              </SelectTrigger>
              <SelectContent>
                {coaches.map(coach => (
                  <SelectItem key={coach.Record_ID} value={coach.Record_ID}>
                    {coach.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.coachToReview && (
              <p className="text-destructive text-sm">{errors.coachToReview.message}</p>
            )}
          </div>
        }

        <div className="space-y-3">
          <Label htmlFor="notes" className="text-base">
            Members Note
          </Label>
          <p className="text-muted-foreground text-sm">Please add any notes, reference links, or anything else you want to share with your submission.</p>
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