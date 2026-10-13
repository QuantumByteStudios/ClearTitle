import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";

export function NotificationsPage() {
  const { data: notificationsData, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await api.get("/notifications");
      return res.data;
    },
  });

  const notifications = notificationsData?.data || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      toast.success("All notifications marked as read");
      refetch();
    } catch {
      toast.error("Failed to update notifications");
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 max-w-2xl mx-auto w-full overflow-hidden">
      {/* Compact Top Bar */}
      <div className="flex items-center justify-between shrink-0 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-black text-foreground tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="warning" dot dotColor="bg-amber-500" className="text-[10px] font-mono py-0">
              {unreadCount} Unread
            </Badge>
          )}
        </div>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            className="gap-1.5 text-xs font-bold text-primary h-8"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Main Content List - Single View Fit */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/70 rounded-2xl text-center p-8 space-y-2">
            <Bell className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Blockchain transaction confirmations and transfer notices will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 pb-4">
            {notifications.map((item) => (
              <Card
                key={item._id}
                className={`futuristic-card rounded-xl border transition-all ${
                  item.read
                    ? "opacity-75"
                    : "border-indigo-300 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20"
                }`}
              >
                <CardContent className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{item.message}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
