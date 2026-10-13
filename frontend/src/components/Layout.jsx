import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useWallet } from "@/hooks/useWallet";
import { truncateAddress } from "@/lib/utils";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import {
  LayoutDashboard,
  PlusCircle,
  FileSearch,
  Bell,
  Shield,
  LogOut,
  Wallet,
  Menu,
  X,
  Building2,
  ShoppingCart,
  AlertTriangle,
  Sun,
  Moon,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

export function Layout({ children }) {
  const { account, disconnectWallet, connectWallet, isConnecting, chainId, switchToLocalhost } = useWallet();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // DEFAULT TO LIGHT MODE: only enable dark mode if explicitly set in localStorage
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  const [currentRole, setCurrentRole] = useState(() => {
    const saved = JSON.parse(localStorage.getItem("user") || "{}");
    return saved.role || "public";
  });

  const handleRoleChange = async (newRole) => {
    try {
      await api.patch("/auth/role", { role: newRole });
      const saved = JSON.parse(localStorage.getItem("user") || "{}");
      saved.role = newRole;
      localStorage.setItem("user", JSON.stringify(saved));
      setCurrentRole(newRole);
      toast.success(`Active persona updated to ${newRole}`);
      if (newRole === "seller" && location.pathname === "/login") navigate("/seller");
    } catch (err) {
      console.error("Role switch error:", err);
      toast.error(err.response?.data?.message || "Failed to switch role");
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    toast.info("Wallet disconnected");
    navigate("/login");
  };

  const navItems = [
    { label: "Public Search", path: "/verify", icon: FileSearch, badge: "Live" },
    ...(currentRole === "seller"
      ? [
          { label: "My Lands", path: "/seller", icon: LayoutDashboard },
          { label: "Register Land", path: "/register", icon: PlusCircle, highlight: true },
        ]
      : []),
    ...(currentRole === "buyer"
      ? [{ label: "Buyer Dashboard", path: "/buyer", icon: ShoppingCart }]
      : []),
    ...(currentRole === "admin"
      ? [{ label: "Registrar Portal", path: "/admin", icon: Shield, badge: "Gov" }]
      : []),
    { label: "Notifications", path: "/notifications", icon: Bell },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground relative overflow-hidden font-sans">
      {/* Ambient Top Iridescent Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-80 bg-radial from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Futuristic Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card/85 backdrop-blur-2xl border-r border-border/80 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 shadow-lg shadow-indigo-500/5 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-5 space-y-6">
          <div className="flex items-center justify-between px-1">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-violet-600 to-cyan-500 p-0.5 shadow-md shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-shadow">
                  <div className="w-full h-full bg-white dark:bg-zinc-950 rounded-[10px] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-card animate-pulse" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-tight text-foreground">LandRegistry</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold">
                    v2.0
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Ethereum On-Chain</span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="iconSm"
              className="lg:hidden text-muted-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <p className="px-3 text-[10px] font-bold text-muted-foreground tracking-widest uppercase">
              Dashboard Navigation
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-bold"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && !isActive && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                        {item.badge}
                      </span>
                    )}
                    {item.highlight && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Card at bottom of sidebar */}
        <div className="p-4 border-t border-border/70 space-y-3 bg-muted/40 backdrop-blur-md">
          {account ? (
            <div className="space-y-3">
              <div className="bg-card/90 border border-border/80 rounded-xl p-3 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Connected Wallet</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">Online</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-foreground">
                    {truncateAddress(account)}
                  </span>
                  <CopyButton value={account} label="Copy address" />
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium text-[11px]">Role:</span>
                  <select
                    value={currentRole}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="text-xs font-bold bg-muted border border-input rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer capitalize shadow-2xs"
                  >
                    <option value="seller">Seller</option>
                    <option value="buyer">Buyer</option>
                    <option value="admin">Admin</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                className="w-full h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive border-border/80"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              variant="glow"
              size="sm"
              className="w-full h-10 font-bold text-xs"
            >
              <Wallet className="w-4 h-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect MetaMask"}
            </Button>
          )}
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 bg-futuristic-grid">
        {/* Floating Futuristic Top Navbar */}
        <header className="h-16 border-b border-border/70 bg-card/75 backdrop-blur-2xl sticky top-0 z-30 px-6 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden h-8 w-8 text-muted-foreground"
            >
              <Menu className="w-4 h-4" />
            </Button>

            <div className="hidden lg:flex items-center gap-2.5 text-xs">
              <span className="font-extrabold text-foreground tracking-tight">Decentralized Land Registry</span>
              <span className="text-muted-foreground">•</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Hardhat Node #31337
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle (Default Light Mode, Toggle to Dark) */}
            <Button
              variant="outline"
              size="iconSm"
              onClick={toggleTheme}
              className="h-8 w-8 rounded-lg border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-2xs"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </Button>

            {account && (
              <div className="flex items-center gap-2 pl-2 border-l border-border/60">
                <Badge variant="outline" className="font-mono text-xs px-3 py-1 flex items-center gap-2 bg-card border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold">{truncateAddress(account)}</span>
                </Badge>
                <CopyButton value={account} label="Copy Connected Address" className="h-7 w-7" />
              </div>
            )}
          </div>
        </header>

        {/* Network Warning Banner */}
        {account && chainId && chainId !== "31337" && chainId !== "11155111" && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-2.5 text-xs text-amber-800 dark:text-amber-300 flex flex-wrap items-center justify-between gap-2 backdrop-blur-sm">
            <span className="flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Wrong Network:</strong> Connected to chain {chainId}. The smart contract is deployed on Hardhat Localhost (Chain ID: 31337).
              </span>
            </span>
            <Button
              onClick={switchToLocalhost}
              size="sm"
              variant="outline"
              className="h-7 text-xs font-semibold bg-background border-amber-500/40 hover:bg-amber-500/10 shadow-2xs"
            >
              Switch to Hardhat Localhost
            </Button>
          </div>
        )}

        {/* Page Content - Single View Fit */}
        <main className="flex-1 p-4 md:p-6 overflow-hidden flex flex-col min-h-0 w-full max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
