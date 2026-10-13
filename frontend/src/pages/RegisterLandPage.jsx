import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { useContract } from "@/hooks/useContract";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadCloud, Hash, MapPin, FileCheck, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

const landSchema = z.object({
  surveyNumber: z.string().min(3, "Survey number must be at least 3 characters"),
  area: z.coerce.number().positive("Area must be greater than 0 sq meters"),
  location: z.string().min(5, "Location must be at least 5 characters"),
  priceEth: z.coerce.number().positive("Price must be greater than 0 ETH"),
});

export function RegisterLandPage() {
  const { signer } = useWallet();
  const contract = useContract(signer);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(landSchema),
  });

  const onSubmit = async (data) => {
    if (!file) {
      toast.error("Please attach the deed document (PDF/Image)");
      return;
    }
    if (!contract) {
      toast.error("Please connect your MetaMask wallet first");
      return;
    }

    try {
      setIsSubmitting(true);

      // Step 1: Upload document to IPFS
      toast.loading("Uploading deed document to Pinata IPFS...", { id: "tx" });
      const formData = new FormData();
      formData.append("document", file);

      const uploadRes = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        },
      });

      const { ipfsHash } = uploadRes.data;
      toast.loading("Document pinned to IPFS! Prompting MetaMask transaction...", { id: "tx" });

      // Step 2: Call registerLand() on Smart Contract
      const priceWei = ethers.parseEther(data.priceEth.toString());

      const tx = await contract.registerLand(
        data.surveyNumber,
        BigInt(data.area),
        data.location,
        priceWei,
        ipfsHash
      );

      toast.loading(`Transaction broadcasted (${tx.hash.slice(0, 10)}...)...`, { id: "tx" });
      await tx.wait(1);

      toast.success("Land registered successfully on blockchain! Awaiting review.", { id: "tx" });
      navigate("/seller");
    } catch (err) {
      console.error("Registration error:", err);
      toast.error(err.reason || err.response?.data?.message || err.message || "Failed to register land", { id: "tx" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col justify-center max-w-xl mx-auto w-full overflow-hidden">
      <div className="space-y-1 mb-3 shrink-0">
        <h1 className="text-xl font-black text-foreground tracking-tight">Register New Land Parcel</h1>
        <p className="text-xs text-muted-foreground">
          Deed is hashed and pinned to IPFS; ownership registered on Ethereum.
        </p>
      </div>

      <Card className="futuristic-card rounded-2xl shadow-sm border border-border/70 p-5 shrink-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          {/* Survey Number */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Government Survey Number
            </Label>
            <Input
              {...register("surveyNumber")}
              startIcon={Hash}
              placeholder="e.g. SN-MH-2024-9421"
              className="h-9 text-xs"
            />
            {errors.surveyNumber && (
              <p className="text-[11px] text-destructive">{errors.surveyNumber.message}</p>
            )}
          </div>

          {/* Area & Price Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Area (m²)
              </Label>
              <Input
                type="number"
                {...register("area")}
                addonRight="sq.m"
                placeholder="1200"
                className="h-9 font-mono text-xs"
              />
              {errors.area && (
                <p className="text-[11px] text-destructive">{errors.area.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Asking Price (ETH)
              </Label>
              <Input
                type="number"
                step="any"
                {...register("priceEth")}
                addonRight="ETH"
                placeholder="2.5"
                className="h-9 font-mono text-xs"
              />
              {errors.priceEth && (
                <p className="text-[11px] text-destructive">{errors.priceEth.message}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Location Address
            </Label>
            <Input
              {...register("location")}
              startIcon={MapPin}
              placeholder="Plot 104, Green Valley Boulevard"
              className="h-9 text-xs"
            />
            {errors.location && (
              <p className="text-[11px] text-destructive">{errors.location.message}</p>
            )}
          </div>

          {/* File Upload Dropzone (Compact) */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Title Deed Document (PDF / Image)
            </Label>
            {file ? (
              <div className="border border-border/80 bg-muted/40 rounded-xl p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-foreground truncate max-w-[240px]">{file.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  onClick={() => setFile(null)}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="border border-dashed border-border/80 hover:border-primary/50 rounded-xl p-3 text-center hover:bg-muted/30 transition-all flex items-center justify-center gap-2 cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-semibold text-foreground">
                  Choose or drag title deed file here
                </span>
                <span className="text-[10px] text-muted-foreground">(PDF, JPG)</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="glow"
            isLoading={isSubmitting}
            className="w-full h-10 text-xs font-bold shadow-md mt-2"
          >
            {isSubmitting ? "Broadcasting to Blockchain..." : "Submit Land Registration"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
