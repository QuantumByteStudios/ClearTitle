import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import api from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { truncateAddress } from "@/lib/utils";
import { Check, ShoppingCart, Clock, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function BuyerDashboard() {
  const { account, signer } = useWallet();
  const contract = useContract(signer);

  // Incoming transfer requests targeting this buyer
  const { data: transfers = [], isLoading, refetch } = useQuery({
    queryKey: ["buyer-transfers", account],
    queryFn: async () => {
      const res = await api.get("/transfers?limit=100");
      return res.data.data.filter(
        (t) => t.toAddress.toLowerCase() === account?.toLowerCase()
      );
    },
    enabled: !!account,
  });

  const handleAcceptTransfer = async (landId) => {
    if (!contract) return;

    try {
      toast.loading("Accepting transfer offer on-chain...", { id: "trf" });
      const tx = await contract.acceptTransfer(BigInt(landId));
      await tx.wait(1);

      toast.success("Transfer accepted! Awaiting final registrar sign-off.", { id: "trf" });
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || err.message || "Failed to accept transfer", { id: "trf" });
    }
  };

  const pendingCount = transfers.filter((t) => t.state === "INITIATED").length;
  const finalizedCount = transfers.filter((t) => t.state === "APPROVED").length;

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Top Bar with Title & Compact Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground tracking-tight">Buyer Dashboard</h1>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground border border-border/50">
              {transfers.length} Incoming Offers
            </span>
            <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
              {pendingCount} Awaiting Signature
            </span>
            <span className="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              {finalizedCount} Finalized
            </span>
          </div>
        </div>
      </div>

      {/* Main Single-View Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse border border-border/60" />
            ))}
          </div>
        ) : transfers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/70 rounded-2xl text-center p-8 space-y-2">
            <ShoppingCart className="w-8 h-8 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No incoming transfer offers</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              When a verified seller initiates an ownership transfer to your wallet, it will appear here for review and acceptance.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {transfers.map((item) => {
              const priceEth = ethers.formatEther(item.price || "0");
              return (
                <Card key={item._id} className="futuristic-card rounded-xl">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-foreground text-sm font-mono">
                          Parcel #{item.landId}
                        </span>
                        <StatusBadge status={item.state} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                        <span>Offered by: {truncateAddress(item.fromAddress)}</span>
                        <CopyButton value={item.fromAddress} label="Copy seller address" className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Offer Price</span>
                        <span className="text-sm font-black text-foreground font-mono">
                          {priceEth} <span className="text-xs text-indigo-600 dark:text-indigo-400">ETH</span>
                        </span>
                      </div>

                      {item.state === "INITIATED" ? (
                        <Button
                          variant="glow"
                          size="sm"
                          onClick={() => handleAcceptTransfer(item.landId)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-8 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept Offer
                        </Button>
                      ) : item.state === "BUYER_ACCEPTED" ? (
                        <Badge variant="warning" dot dotColor="bg-amber-500" className="px-2.5 py-1 font-semibold text-xs">
                          Pending Registrar Sign-Off
                        </Badge>
                      ) : (
                        <Badge variant="success" dot dotColor="bg-emerald-500" className="px-2.5 py-1 font-semibold text-xs">
                          Ownership Finalized
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
