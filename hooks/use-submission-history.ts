"use client";

import { useQuery } from "@tanstack/react-query";
import { SubmissionHistoryResponse } from "@/lib/types";

export function useSubmissionHistory(email: string) {
    return useQuery<SubmissionHistoryResponse>({
        queryKey: ["submission-history", email],
        queryFn: async () => {
            if (!email) {
                throw new Error("Email is required");
            }

            const response = await fetch(`/api/history`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch submission history");
            }

            const data = await response.json();
            return {
                submissions: data,
                total: data.length,
            };
        },
        enabled: !!email, // Only run query if email is provided
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 1, // Only retry once on failure
    });
} 