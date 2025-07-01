"use client";

import * as React from "react";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useId } from "react";

interface RadioGroupCardsProps {
  value: string;
  onChange: (value: string) => void;
  items: {
    value: string;
    label: string;
  }[];
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function RadioGroupCards({
  value,
  onChange,
  items,
  orientation = "vertical",
  className,
  ...props
}: RadioGroupCardsProps) {
  const handleSelect = (itemValue: string) => {
    onChange(itemValue);
  };

  const groupId = useId();

  return (
    <div
      role="radiogroup"
      aria-labelledby={`${groupId}-label`}
      className={cn(
        "grid gap-3",
        orientation === "horizontal" ? "sm:grid-cols-2 md:grid-cols-3" : "grid-cols-1",
        className
      )}
      {...props}
    >
      {items.map((item) => {
        const itemId = `${groupId}-${item.value}`;
        const isSelected = value === item.value;

        return (
          <div
            key={item.value}
            role="radio"
            id={itemId}
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => handleSelect(item.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(item.value);
              }
            }}
            className={cn(
              "relative flex cursor-pointer rounded-lg border-2 p-4 transition-all",
              "outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <div className="flex w-full items-start space-x-3">
              <div className="flex-1">
                <div className="text-sm font-medium">{item.label}</div>
              </div>
              {isSelected && (
                <CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}