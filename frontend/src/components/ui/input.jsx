import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const Input = React.forwardRef(
  (
    {
      className,
      type,
      startIcon: StartIcon,
      endIcon: EndIcon,
      addonRight,
      shortcut,
      onClear,
      value,
      ...props
    },
    ref
  ) => {
    const hasAddons = StartIcon || EndIcon || addonRight || shortcut || onClear;

    if (!hasAddons) {
      return (
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-lg border border-input bg-background/50 px-3 py-1 text-sm shadow-2xs transition-all duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          value={value}
          {...props}
        />
      );
    }

    return (
      <div className="relative flex items-center w-full">
        {StartIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
            <StartIcon className="w-4 h-4" />
          </div>
        )}

        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-lg border border-input bg-background/50 py-1 text-sm shadow-2xs transition-all duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
            StartIcon ? "pl-9" : "pl-3",
            addonRight || shortcut || onClear || EndIcon ? "pr-14" : "pr-3",
            className
          )}
          ref={ref}
          value={value}
          {...props}
        />

        <div className="absolute right-2.5 flex items-center gap-1.5 pointer-events-auto">
          {onClear && value && (
            <button
              type="button"
              onClick={onClear}
              className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {shortcut && (
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              {shortcut}
            </kbd>
          )}

          {addonRight && (
            <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
              {addonRight}
            </span>
          )}

          {EndIcon && !addonRight && (
            <EndIcon className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
