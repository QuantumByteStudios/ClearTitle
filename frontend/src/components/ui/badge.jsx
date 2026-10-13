import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = ({
  variant = "default",
  className = "",
} = {}) => {
  const base =
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all select-none";

  const variants = {
    default:
      "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/80",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "border-transparent bg-destructive/15 text-destructive border-destructive/30",
    outline:
      "text-foreground border-border bg-background/50",
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border",
    warning:
      "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 border",
    info:
      "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400 border",
    glass:
      "border-white/20 dark:border-white/10 bg-background/50 backdrop-blur-md text-foreground",
    pulse:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 animate-pulse",
  };

  return cn(base, variants[variant] || variants.default, className);
};

function Badge({ className, variant = "default", dot = false, dotColor = "bg-emerald-500", children, ...props }) {
  return (
    <div className={badgeVariants({ variant, className })} {...props}>
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 animate-pulse", dotColor)} />
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
