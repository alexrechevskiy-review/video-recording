"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  onComplete: () => void;
  seconds?: number;
  className?: string;
}

export default function CountdownTimer({
  onComplete,
  seconds = 3,
  className,
}: CountdownTimerProps) {
  const [count, setCount] = useState(seconds);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive) return;

    if (count <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, isActive, onComplete]);

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        "transition-opacity duration-300",
        isActive ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "animate-ping-sm bg-white/50"
          )}
        ></div>
        <div
          className={cn(
            "flex items-center justify-center",
            "h-32 w-32 rounded-full bg-transparent border-2 border-white",
            "text-5xl font-bold text-white"
          )}
        >
          {count}
        </div>
      </div>
    </div>
  );
}