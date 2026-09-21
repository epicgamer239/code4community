"use client";

import { useState } from "react";
import Image from "next/image";
import { getInitials } from "@/lib/profile";

export default function ProfileImage({
  src,
  alt,
  name,
  className,
  showOnlineIndicator = false,
}) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getFixedImageUrl = (url) => {
    if (!url) return null;
    if (url.includes("lh3.googleusercontent.com")) {
      const cleanUrl = url.split("=")[0];
      return `${cleanUrl}=s96-c`;
    }
    return url;
  };

  const fixedSrc = getFixedImageUrl(src);
  const resolvedSrc =
    fixedSrc && fixedSrc.includes("lh3.googleusercontent.com")
      ? `/api/avatar?u=${encodeURIComponent(src)}&sz=96`
      : fixedSrc;

  if (!resolvedSrc || imageError) {
    return (
      <div
        className={`${className} flex items-center justify-center`}
        style={{
          background: `linear-gradient(135deg, hsl(${Math.abs(name?.charCodeAt(0) || 0) % 360}, 70%, 50%), hsl(${Math.abs(name?.charCodeAt(1) || 0) % 360}, 70%, 50%))`,
        }}
      >
        <span className="text-white font-semibold text-sm">
          {getInitials(name)}
        </span>
        {showOnlineIndicator && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Image
        src={resolvedSrc}
        alt={alt}
        width={96}
        height={96}
        className={`${className} ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
        loading="lazy"
        onLoad={() => {
          setIsLoading(false);
          setImageError(false);
        }}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
      />
      {isLoading && (
        <div
          className={`${className} absolute inset-0 flex items-center justify-center`}
          style={{
            background: `linear-gradient(135deg, hsl(${Math.abs(name?.charCodeAt(0) || 0) % 360}, 70%, 50%), hsl(${Math.abs(name?.charCodeAt(1) || 0) % 360}, 70%, 50%))`,
          }}
        >
          <span className="text-white font-semibold text-sm">
            {getInitials(name)}
          </span>
        </div>
      )}
      {showOnlineIndicator && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
      )}
    </div>
  );
}
