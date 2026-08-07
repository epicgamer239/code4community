"use client";

export default function SkeletonLoader({ 
  variant = "text", 
  width = "100%", 
  height = "1rem",
  className = "",
  lines = 1 
}) {
  const baseClasses = "animate-pulse bg-muted rounded";
  
  if (variant === "text") {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses}`}
            style={{ 
              width: index === lines - 1 ? "75%" : width,
              height: height 
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className={`${baseClasses} p-6 ${className}`}>
        <div className="space-y-4">
          <div className={`${baseClasses} h-4 w-3/4`} />
          <div className={`${baseClasses} h-4 w-1/2`} />
          <div className={`${baseClasses} h-20 w-full`} />
        </div>
      </div>
    );
  }

  if (variant === "avatar") {
    return (
      <div 
        className={`${baseClasses} rounded-full ${className}`}
        style={{ width, height }}
      />
    );
  }

  if (variant === "button") {
    return (
      <div 
        className={`${baseClasses} ${className}`}
        style={{ width, height }}
      />
    );
  }

  return (
    <div 
      className={`${baseClasses} ${className}`}
      style={{ width, height }}
    />
  );
}

// Predefined skeleton components for common use cases
export function UserCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center space-x-3">
        <SkeletonLoader variant="avatar" width="2.5rem" height="2.5rem" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader width="60%" height="1rem" />
          <SkeletonLoader width="40%" height="0.75rem" />
        </div>
      </div>
    </div>
  );
}

export function AppCardSkeleton() {
  return (
    <div className="card-elevated h-[180px] p-6 space-y-4">
      <SkeletonLoader width="80%" height="1.5rem" />
      <SkeletonLoader lines={2} width="100%" height="0.875rem" />
      <div className="flex justify-end">
        <SkeletonLoader variant="button" width="0.5rem" height="0.5rem" />
      </div>
    </div>
  );
}

export function RequestCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-4">
      {/* Student Info Header */}
      <div className="flex items-center space-x-4">
        <div className="relative">
          <SkeletonLoader variant="avatar" width="3rem" height="3rem" className="rounded-full" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full border-2 border-white dark:border-gray-800"></div>
        </div>
        <div className="flex-1 space-y-2">
          <SkeletonLoader width="70%" height="1.125rem" />
          <SkeletonLoader width="30%" height="0.875rem" />
        </div>
      </div>

      {/* Course Badge */}
      <div>
        <SkeletonLoader width="40%" height="1.5rem" className="rounded-full" />
      </div>

      {/* Request Time */}
      <div className="flex items-center space-x-2">
        <SkeletonLoader width="4rem" height="1rem" />
        <SkeletonLoader width="60%" height="0.875rem" />
      </div>

      {/* Action Button */}
      <SkeletonLoader width="100%" height="3rem" className="rounded-xl" />
    </div>
  );
}
