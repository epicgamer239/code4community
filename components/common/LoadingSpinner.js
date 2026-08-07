"use client";
import { useState, useEffect } from "react";

export default function LoadingSpinner({ 
  size = "md", 
  color = "primary", 
  text = null,
  className = "" 
}) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8",
    xl: "w-12 h-12"
  };

  const colorClasses = {
    primary: "text-primary",
    white: "text-white",
    muted: "text-muted-foreground"
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}></div>
        {text && (
          <span className={`text-sm ${colorClasses[color]}`}>
            {text}{dots}
          </span>
        )}
      </div>
    </div>
  );
}
