import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { GenerateResult } from "@/components/types/schema-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(utcIsoString: string): string {
  const now = new Date();
  const utcPast = new Date(utcIsoString);
  const localPast = new Date(
    utcPast.getTime() - utcPast.getTimezoneOffset() * 60000,
  );
  const diffInSeconds = Math.floor(
    (now.getTime() - localPast.getTime()) / 1000,
  );

  const minutes = Math.floor(diffInSeconds / 60);
  const hours = Math.floor(diffInSeconds / 3600);
  const days = Math.floor(diffInSeconds / 86400);
  const months = Math.floor(diffInSeconds / 2592000);
  const years = Math.floor(diffInSeconds / 31536000);

  if (years > 0) {
    return years === 1 ? "1 year ago" : `${years} years ago`;
  } else if (months > 0) {
    return months === 1 ? "1 month ago" : `${months} months ago`;
  } else if (days > 0) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  } else if (hours > 0) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  } else if (minutes > 0) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  } else {
    return "Just now";
  }
}

export function getGenerateResultName(
  generateResult: GenerateResult | undefined,
): string {
  if (!generateResult) {
    return "";
  }
  if ("modelName" in generateResult) {
    return generateResult.modelName;
  } else if ("functionName" in generateResult) {
    return generateResult.functionName;
  } else if ("dagName" in generateResult) {
    return generateResult.dagName;
  } else {
    return "";
  }
}
