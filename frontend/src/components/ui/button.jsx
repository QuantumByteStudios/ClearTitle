import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = ({
  variant = "default",
  size = "default",
  className = "",
} = {}) => {
  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]";

  const variants = {
    default:
      "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
    destructive:
      "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
    outline:
      "border border-input bg-background/50 backdrop-blur-xs shadow-2xs hover:bg-accent hover:text-accent-foreground hover:border-foreground/20",
    secondary:
      "bg-secondary text-secondary-foreground shadow-2xs hover:bg-secondary/80",
    ghost:
      "hover:bg-accent hover:text-accent-foreground",
    link:
      "text-primary underline-offset-4 hover:underline p-0 h-auto",
    
    // ── Advanced Unique Variants ──
    glow:
      "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:bg-primary/95 border border-primary/20",
    shine:
      "relative overflow-hidden bg-primary text-primary-foreground shadow-md transition-all hover:shadow-lg after:absolute after:inset-0 after:translate-x-[-100%] after:bg-linear-to-r after:from-transparent after:via-white/20 after:to-transparent hover:after:animate-[shimmer_1.5s_infinite]",
    glass:
      "border border-white/20 dark:border-white/10 bg-background/40 backdrop-blur-md shadow-xs hover:bg-background/60 text-foreground",
    gradient:
      "bg-linear-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-md hover:opacity-95",
    success:
      "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700",
  };

  const sizes = {
    default: "h-9 px-4 py-2",
    sm: "h-8 rounded-md px-3 text-xs",
    lg: "h-11 rounded-xl px-7 text-sm font-semibold",
    xl: "h-12 rounded-xl px-8 text-base font-semibold",
    icon: "h-9 w-9 p-0",
    iconSm: "h-7 w-7 p-0 rounded-md",
  };

  return cn(base, variants[variant] || variants.default, sizes[size] || sizes.default, className);
};

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
