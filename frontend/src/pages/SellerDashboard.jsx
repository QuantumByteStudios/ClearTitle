import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import api from "@/lib/api";
import { LandCard } from "@/components/LandCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PlusCircle, ArrowRightLeft, Building, ShieldCheck, Coins, Wallet } from "lucide-react";
import { toast } from "sonner";

export function SellerDashboard() {
  const { account, signer } = useWallet();
  const contract = useContract(signer);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedLand, setSelectedLand] = useState(null);
  const [buyerAddress, setBuyerAddress] = useState("");
  const [salePriceEth, setSalePriceEth] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  // Fetch seller's lands from MongoDB
  const { data: lands = [], isLoading, refetch } = useQuery({
    queryKey: ["my-lands", account],
    queryFn: async () => {
      if (!account) return [];
      const res = await api.get(`/lands/owner/${account}?limit=100`);
      return res.data.data;
    },
    enabled: !!account,
  });

  const openTransferModal = (land) => {
    setSelectedLand(land);
    setSalePriceEth(ethers.formatEther(land.price || "0"));
    setTransferModalOpen(true);
  };

  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    if (!contract || !selectedLand) return;

    try {
      setIsTransferring(true);
      toast.loading("Initiating transfer on blockchain...", { id: "trf" });

      const priceWei = ethers.parseEther(salePriceEth.toString());
      const tx = await contract.initiateTransfer(
        BigInt(selectedLand.landId),
        buyerAddress,
        priceWei
      );

      toast.loading(`Transaction broadcasted (${tx.hash.slice(0, 8)}...)...`, { id: "trf" });
      await tx.wait(1);

      toast.success("Transfer initiated! Buyer will receive a notification to accept.", { id: "trf" });
      setTransferModalOpen(false);
      setBuyerAddress("");
      refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.reason || err.message || "Failed to initiate transfer", { id: "trf" });
    } finally {
      setIsTransferring(false);
    }
  };

  // Calculations for quick stats
  const totalVerified = lands.filter((l) => l.status === "VERIFIED").length;
  const totalValuation = lands.reduce((acc, l) => {
    try {
      return acc + parseFloat(ethers.formatEther(l.price || "0"));
    } catch {
      return acc;
    }
  }, 0);

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Top Bar: Title, Inline Metrics Strip & Action Button in ONE ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground tracking-tight">Seller Dashboard</h1>
          
          {/* Inline compact stats */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-muted px-2.5 py-1 rounded-md text-foreground border border-border/50">
              {lands.length} Parcels
            </span>
            <span className="text-xs font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
              {totalVerified} Verified
            </span>
            <span className="text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
              {totalValuation.toFixed(2)} ETH Valuation
            </span>
          </div>
        </div>

        <Link to="/register">
          <Button variant="glow" size="sm" className="gap-1.5 font-bold text-xs h-9">
            <PlusCircle className="w-4 h-4" />
            Register Land
          </Button>
        </Link>
      </div>

      {/* Main Single-View Content Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse border border-border/60" />
            ))}
          </div>
        ) : lands.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/70 rounded-2xl text-center p-8 space-y-3">
            <Building className="w-8 h-8 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No land parcels registered yet</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Register your first title deed and survey number on the blockchain.
            </p>
            <Link to="/register">
              <Button size="sm" variant="outline" className="mt-2 text-xs font-semibold gap-1.5">
                <PlusCircle className="w-3.5 h-3.5" />
                Register First Parcel
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {lands.map((land) => (
              <div key={land.landId} className="flex flex-col space-y-1.5">
                <LandCard land={land} />
                {land.status === "VERIFIED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openTransferModal(land)}
                    className="w-full h-7 gap-1 text-[11px] font-bold border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    Initiate Transfer
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Initiation Shadcn Dialog */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate Ownership Transfer</DialogTitle>
            <DialogDescription>
              Transfer Land Parcel #{selectedLand?.landId} ({selectedLand?.surveyNumber}) to a registered buyer.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInitiateTransfer} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="buyerAddress" className="text-xs font-semibold">
                Buyer Ethereum Wallet Address
              </Label>
              <Input
                id="buyerAddress"
                required
                startIcon={Wallet}
                placeholder="0x..."
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salePrice" className="text-xs font-semibold">
                Agreed Sale Price
              </Label>
              <Input
                id="salePrice"
                required
                type="number"
                step="any"
                addonRight="ETH"
                placeholder="e.g. 1.25"
                value={salePriceEth}
                onChange={(e) => setSalePriceEth(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTransferModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="glow"
                size="sm"
                isLoading={isTransferring}
                className="gap-1.5 font-bold"
              >
                Confirm & Send Offer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
