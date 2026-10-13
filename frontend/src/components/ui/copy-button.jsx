import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CopyButton({ value, className, label = "Copy", ...props }) {
  const [hasCopied, setHasCopied] = React.useState(false);

  const copyToClipboard = async (e) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setHasCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="iconSm"
      onClick={copyToClipboard}
      className={cn(
        "h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors",
        hasCopied && "text-emerald-500 hover:text-emerald-500",
        className
      )}
      title={label}
      {...props}
    >
      {hasCopied ? (
        <Check className="w-3.5 h-3.5 animate-in zoom-in-75 duration-200" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

