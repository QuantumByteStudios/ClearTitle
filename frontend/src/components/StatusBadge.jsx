import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const badgeVariants = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  VERIFIED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
  DISPUTED: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
  FROZEN: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  
  // Transfer States
  INITIATED: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800",
  BUYER_ACCEPTED: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  CANCELLED: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-700",
};

export function StatusBadge({ status, className }) {
  const variant = badgeVariants[status] || "bg-zinc-100 text-zinc-800 border-zinc-300";

  return (
    <Badge
      variant="outline"
      className={cn(
        "px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase shadow-2xs rounded-full",
        variant,
        className
      )}
    >
      {status}
    </Badge>
  );
}
