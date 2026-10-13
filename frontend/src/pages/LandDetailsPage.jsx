import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import api from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { OwnershipTimeline } from "@/components/OwnershipTimeline";
import { QRGenerator } from "@/components/QRGenerator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { MapPin, Maximize2, ShieldCheck, FileText, ArrowLeft, ExternalLink, QrCode } from "lucide-react";

export function LandDetailsPage() {
  const { id } = useParams();

  // Fetch Land Metadata from Mongo
  const { data: land, isLoading: isLandLoading } = useQuery({
    queryKey: ["land-details", id],
    queryFn: async () => {
      const res = await api.get(`/lands/${id}`);
      return res.data.data;
    },
  });

  // Fetch Authoritative Blockchain Ownership History
  const { data: history = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ["land-history", id],
    queryFn: async () => {
      const res = await api.get(`/lands/${id}/history`);
      return res.data.data;
    },
  });

  if (isLandLoading) {
    return <div className="h-full rounded-2xl bg-muted/40 animate-pulse border border-border/60" />;
  }

  if (!land) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
        <h2 className="text-lg font-bold text-foreground">Land Parcel Not Found</h2>
        <Link to="/">
          <Button variant="outline" size="sm">Return to registry</Button>
        </Link>
      </div>
    );
  }

  const priceEth = land.price ? ethers.formatEther(land.price) : "0";
  const verificationUrl = `${window.location.origin}/lands/${land.landId}`;

  return (
    <div className="h-full flex flex-col space-y-3 overflow-hidden">
      {/* Compact Top Navigation Bar */}
      <div className="flex items-center justify-between shrink-0 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <Link to="/verify">
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-foreground">Parcel #{land.landId}</span>
            <span className="text-xs text-muted-foreground font-mono">({land.surveyNumber})</span>
          </div>
        </div>
        <StatusBadge status={land.status} />
      </div>

      {/* 2-Column Split Single View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 pb-1">
        {/* Left Column (2/3): Metadata & Timeline */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden space-y-3">
          {/* Metadata Card */}
          <Card className="futuristic-card rounded-2xl p-4 shrink-0 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Area</span>
                <p className="font-bold text-foreground font-mono flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-indigo-500" />
                  {land.area} m²
                </p>
              </div>

              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Valuation</span>
                <p className="font-bold text-foreground font-mono">
                  {priceEth} ETH
                </p>
              </div>

              <div className="bg-muted/40 p-2.5 rounded-xl border border-border/40 col-span-2 space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Location</span>
                <p className="font-medium text-foreground truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                  <span className="truncate">{land.location}</span>
                </p>
              </div>
            </div>

            {/* Owner & IPFS Deed in compact strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
              <div className="flex items-center justify-between bg-card p-2 rounded-lg border border-border/60">
                <span className="text-muted-foreground text-[11px] font-medium">Owner:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-foreground text-[11px] truncate max-w-[150px]">
                    {land.ownerAddress}
                  </span>
                  <CopyButton value={land.ownerAddress} label="Copy Owner" className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-center justify-between bg-card p-2 rounded-lg border border-border/60">
                <span className="text-muted-foreground text-[11px] font-medium">IPFS Deed:</span>
                <div className="flex items-center gap-1.5">
                  <CopyButton value={land.ipfsHash} label="Copy Hash" className="h-5 w-5" />
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${land.ipfsHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] font-bold gap-1">
                      <span>View Deed</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </Card>

          {/* Audit Timeline with internal scroll */}
          <Card className="futuristic-card rounded-2xl flex-1 min-h-0 flex flex-col p-4 overflow-hidden space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">
              Immutable Ownership Audit History
            </span>
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <OwnershipTimeline history={history} />
            </div>
          </Card>
        </div>

        {/* Right Column (1/3): Public QR Code Widget */}
        <Card className="futuristic-card rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3 h-full overflow-hidden">
          <div className="space-y-1">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800">
              <QrCode className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Mobile Verification QR</h3>
            <p className="text-[11px] text-muted-foreground max-w-[200px] leading-tight">
              Scan with phone camera to verify deed authenticity on-chain.
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl shadow-inner border border-slate-200">
            <QRGenerator value={verificationUrl} size={140} />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <CopyButton value={verificationUrl} label="Copy Link" className="h-7 w-7" />
            <span className="text-[11px] text-muted-foreground font-medium">Copy Public URL</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
