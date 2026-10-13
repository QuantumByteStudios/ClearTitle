import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import api from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Wallet, ArrowRight, ShieldCheck, CheckCircle2, Cpu, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";

export function LoginPage() {
  const { connectWallet, isConnecting } = useWallet();
  const [selectedRole, setSelectedRole] = useState("seller");
  const [isSigning, setIsSigning] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setIsSigning(true);

      // 1. Request Wallet Connection
      const { account, signer } = await connectWallet();
      toast.loading("Requesting cryptographic nonce from server...", { id: "login" });

      // 2. Fetch Nonce from Backend
      const nonceRes = await api.get(`/auth/nonce/${account}`);
      const nonceMessage = nonceRes.data.nonce;

      // 3. Request Signature via MetaMask
      toast.loading("Please sign the authentication message in MetaMask...", { id: "login" });
      const signature = await signer.signMessage(nonceMessage);

      // 4. Verify Signature on Backend
      toast.loading("Verifying signature and generating session...", { id: "login" });
      const verifyRes = await api.post("/auth/verify", {
        address: account,
        signature,
        role: selectedRole,
      });

      const { token, user } = verifyRes.data;

      // Update role locally if specified
      user.role = selectedRole;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      toast.success("Authentication successful!", { id: "login" });

      // 5. Redirect by Role
      if (selectedRole === "admin") navigate("/admin");
      else if (selectedRole === "buyer") navigate("/buyer");
      else navigate("/seller");
    } catch (err) {
      console.error("Login failure:", err);
      toast.error(err.reason || err.response?.data?.message || err.message || "Login failed", { id: "login" });
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-futuristic-grid relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-radial from-indigo-500/15 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <Card className="w-full max-w-md futuristic-card shadow-2xl rounded-3xl overflow-hidden relative">
        {/* Top Iridescent Line */}
        <div className="h-1.5 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-cyan-400" />

        <CardHeader className="text-center space-y-3 pb-6 pt-8">
          <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
            {/* Pulsing concentric rings */}
            <span className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping" />
            <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-indigo-600 via-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center relative">
              <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Building2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">
              Land Ownership Portal
            </CardTitle>
            <CardDescription className="text-xs font-medium">
              Zero-knowledge session authentication via MetaMask ERC-191.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-6 sm:px-8">
          {/* Futuristic Role Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Select Access Persona</span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">Role Switcher</span>
            </Label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
              {[
                { id: "seller", label: "Seller" },
                { id: "buyer", label: "Buyer" },
                { id: "admin", label: "Admin" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    selectedRole === r.id
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-zinc-700"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleLogin}
            disabled={isConnecting || isSigning}
            variant="glow"
            className="w-full h-12 text-xs font-bold rounded-xl gap-2 shadow-lg shadow-primary/20"
          >
            <Wallet className="w-4 h-4" />
            {isSigning
              ? "Awaiting Wallet Signature..."
              : isConnecting
              ? "Connecting MetaMask..."
              : "Connect & Authenticate"}
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </CardContent>

        <CardFooter className="pt-4 pb-6 border-t border-border/60 grid grid-cols-2 gap-3 text-[11px] text-muted-foreground bg-slate-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Anti-replay Nonce</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>ERC-191 Verified</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
