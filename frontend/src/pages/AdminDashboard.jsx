import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import api from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { truncateAddress } from "@/lib/utils";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Download,
  Users,
  Building,
  ArrowRightLeft,
  FileCheck2,
  ExternalLink,
  BarChart2,
} from "lucide-react";
import { toast } from "sonner";

export function AdminDashboard() {
  const { signer } = useWallet();
  const contract = useContract(signer);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModalLandId, setRejectModalLandId] = useState(null);
  const [showChart, setShowChart] = useState(false);

  // 1. Fetch Admin Metrics
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await api.get("/admin/stats");
      return res.data.data;
    },
  });

  // 2. Fetch Pending Land Verifications Queue
  const { data: pendingLands = [], refetch: refetchLands } = useQuery({
    queryKey: ["admin-pending-lands"],
    queryFn: async () => {
      const res = await api.get("/admin/pending");
      return res.data.data;
    },
  });

  // 3. Fetch Pending Transfers Queue
  const { data: pendingTransfers = [], refetch: refetchTransfers } = useQuery({
    queryKey: ["admin-pending-transfers"],
    queryFn: async () => {
      const res = await api.get("/admin/pending-transfers");
      return res.data.data;
    },
  });

  // --- Contract Actions ---
  const handleVerifyLand = async (landId) => {
    if (!contract) return;
    try {
      toast.loading(`Verifying Land #${landId} on-chain...`, { id: "admin-tx" });
      const tx = await contract.verifyLand(BigInt(landId));
      await tx.wait(1);

      toast.success(`Land #${landId} verified successfully!`, { id: "admin-tx" });
      refetchLands();
      refetchStats();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || err.message || "Failed to verify land", { id: "admin-tx" });
    }
  };

  const handleRejectLand = async (e) => {
    e.preventDefault();
    if (!contract || !rejectModalLandId) return;

    try {
      toast.loading(`Rejecting Land #${rejectModalLandId}...`, { id: "admin-tx" });
      const tx = await contract.rejectLand(BigInt(rejectModalLandId), rejectReason);
      await tx.wait(1);

      toast.success(`Land #${rejectModalLandId} rejected.`, { id: "admin-tx" });
      setRejectModalLandId(null);
      setRejectReason("");
      refetchLands();
      refetchStats();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || err.message || "Failed to reject land", { id: "admin-tx" });
    }
  };

  const handleApproveTransfer = async (landId) => {
    if (!contract) return;
    try {
      toast.loading(`Approving transfer for Land #${landId}...`, { id: "admin-tx" });
      const tx = await contract.approveTransfer(BigInt(landId));
      await tx.wait(1);

      toast.success(`Transfer approved! Ownership officially changed.`, { id: "admin-tx" });
      refetchTransfers();
      refetchStats();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || err.message || "Failed to approve transfer", { id: "admin-tx" });
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.loading("Generating CSV Export...", { id: "export" });
      const response = await api.get("/admin/export", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `lands-registry-audit-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV Downloaded!", { id: "export" });
    } catch (err) {
      toast.error("Export failed", { id: "export" });
    }
  };

  const landsCount = statsData?.lands || {};
  const transfersCount = statsData?.transfers || {};
  const chartData = statsData?.charts?.transfersPerMonth || [];

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden">
      {/* Compact Top Bar with Title & Inline Metric Pills in ONE ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-black text-foreground tracking-tight">Registrar Portal</h1>

          {/* Inline Compact Stats Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground border border-border/50">
              {landsCount.total || 0} Registered
            </span>
            <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
              {landsCount.pending || 0} Need Review
            </span>
            <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
              {transfersCount.pending || 0} Transfers
            </span>
            <span className="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              {statsData?.users?.total || 0} Users
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {chartData.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChart(!showChart)}
              className="gap-1.5 text-xs font-semibold h-8"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              {showChart ? "Hide Chart" : "Activity Chart"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 font-bold text-xs h-8 border-border/80"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Optional Collapsible Minimal Chart */}
      {showChart && chartData.length > 0 && (
        <Card className="futuristic-card p-3 rounded-xl shrink-0 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="month" stroke="#888888" fontSize={11} />
              <YAxis stroke="#888888" fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* 2-COLUMN SPLIT SINGLE VIEW - Both queues side-by-side in one viewport! */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 pb-1">
        {/* Left Column: Pending Land Verifications Queue */}
        <div className="flex flex-col h-full overflow-hidden futuristic-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between shrink-0 border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Land Deed Verification Queue</span>
              <Badge variant="warning" dot dotColor="bg-amber-500" className="text-[10px] font-mono py-0">
                {pendingLands.length}
              </Badge>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 divide-y divide-border/60">
            {pendingLands.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-8">
                No lands pending registrar review.
              </div>
            ) : (
              pendingLands.map((land) => (
                <div key={land.landId} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground font-mono">#{land.landId}</span>
                      <span className="text-xs font-semibold text-foreground truncate">{land.surveyNumber}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{land.location}</p>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${land.ipfsHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary font-semibold hover:underline"
                    >
                      <span>IPFS Deed</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleVerifyLand(land.landId)}
                      className="gap-1 font-bold text-[11px] h-7 px-2.5"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Verify
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setRejectModalLandId(land.landId)}
                      className="gap-1 font-bold text-[11px] h-7 px-2"
                    >
                      <XCircle className="w-3 h-3" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Pending Ownership Transfers Queue */}
        <div className="flex flex-col h-full overflow-hidden futuristic-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between shrink-0 border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Ownership Transfer Approval</span>
              <Badge variant="secondary" className="text-[10px] font-mono py-0">
                {pendingTransfers.length}
              </Badge>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 divide-y divide-border/60">
            {pendingTransfers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground p-8">
                No transfer agreements awaiting registrar sign-off.
              </div>
            ) : (
              pendingTransfers.map((item) => (
                <div key={item._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-foreground font-mono">Parcel #{item.landId}</span>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                      <span>{truncateAddress(item.fromAddress)}</span>
                      <span>➔</span>
                      <span>{truncateAddress(item.toAddress)}</span>
                      <CopyButton value={item.toAddress} label="Copy buyer address" className="h-5 w-5" />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="glow"
                    onClick={() => handleApproveTransfer(item.landId)}
                    className="gap-1 font-bold text-[11px] h-7 px-2.5 shrink-0"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Approve
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      <Dialog
        open={!!rejectModalLandId}
        onOpenChange={(open) => {
          if (!open) {
            setRejectModalLandId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Land Registration #{rejectModalLandId}</DialogTitle>
            <DialogDescription>
              State the official legal or documentation reason for rejecting this land registration.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRejectLand} className="space-y-4 py-2">
            <Textarea
              required
              rows={3}
              placeholder="State reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="resize-none"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectModalLandId(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                className="font-bold"
              >
                Confirm Reject
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
