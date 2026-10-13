import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine Tailwind classes safely (shadcn/ui standard utility)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Truncate long Ethereum address to 0x1234...5678
 */
export function truncateAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format timestamp (seconds or ms) to localized string
 */
export function formatDate(timestamp) {
  if (!timestamp) return "N/A";
  const ms = typeof timestamp === "number" && timestamp < 1000000000000 
    ? timestamp * 1000 
    : Number(timestamp);
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

