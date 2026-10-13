import React from "react";
import { Link } from "react-router-dom";
import { ethers } from "ethers";
import { StatusBadge } from "./StatusBadge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight } from "lucide-react";
import { truncateAddress } from "@/lib/utils";

export function LandCard({ land }) {
  const formattedPrice = land.price ? ethers.formatEther(land.price) : "0";

  return (
    <Card className="futuristic-card overflow-hidden flex flex-col justify-between group rounded-xl p-4 space-y-3">
      {/* Header: ID, Address & Status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-400 uppercase bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 shrink-0">
            #{land.landId}
          </span>
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
            {truncateAddress(land.ownerAddress)}
          </span>
        </div>
        <StatusBadge status={land.status} />
      </div>

      {/* Title & Location in one clean block */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
          {land.surveyNumber}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">{land.location}</span>
          <span>•</span>
          <span className="font-mono text-[11px] shrink-0">{land.area} m²</span>
        </div>
      </div>

      {/* Footer: Price & Direct Link */}
      <div className="flex items-center justify-between pt-2 border-t border-border/50">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Asking Price</span>
          <span className="font-extrabold text-foreground text-sm font-mono">
            {formattedPrice} <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">ETH</span>
          </span>
        </div>

        <Link to={`/lands/${land.landId}`}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold gap-1 border-border/80 group-hover:bg-primary group-hover:text-primary-foreground transition-all"
          >
            <span>View</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
