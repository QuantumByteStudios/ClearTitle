import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendPositive = true,
  description,
  accentColor = "text-indigo-600 dark:text-indigo-400",
  className,
}) {
  return (
    <Card
      className={cn(
        "futuristic-card rounded-2xl relative overflow-hidden group",
        className
      )}
    >
      {/* Background radial glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />

      <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
            {title}
          </span>
          {Icon && (
            <div className={cn("p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 shadow-2xs", accentColor)}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            {value}
          </div>
          {(trend || description) && (
            <div className="flex items-center gap-2 pt-0.5">
              {trend && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-extrabold rounded-full font-mono",
                    trendPositive
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                  )}
                >
                  {trend}
                </span>
              )}
              {description && (
                <span className="text-xs text-muted-foreground font-medium">{description}</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
