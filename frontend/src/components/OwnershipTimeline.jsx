import React from "react";
import { formatDate, truncateAddress } from "@/lib/utils";
import { CheckCircle2, History, ArrowRightLeft, ShieldCheck, AlertCircle } from "lucide-react";

export function OwnershipTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No recorded history yet for this parcel.
      </div>
    );
  }

  const getEventIcon = (type) => {
    switch (type) {
      case "REGISTERED":
        return <CheckCircle2 className="w-5 h-5 text-amber-500" />;
      case "VERIFIED":
        return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      case "TRANSFER":
        return <ArrowRightLeft className="w-5 h-5 text-primary" />;
      case "FROZEN":
      case "DISPUTED":
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <History className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
      {history.map((item, index) => (
        <div key={index} className="relative group">
          {/* Timeline node icon */}
          <div className="absolute -left-6 top-1 bg-background rounded-full border p-1 shadow-sm">
            {getEventIcon(item.transactionType)}
          </div>

          <div className="bg-card border rounded-lg p-4 space-y-1 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {item.transactionType}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDate(item.timestamp)}
              </span>
            </div>

            <p className="text-sm font-mono text-foreground font-medium">
              Owner: {truncateAddress(item.owner)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

