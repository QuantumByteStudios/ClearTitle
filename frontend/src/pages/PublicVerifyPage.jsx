import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { LandCard } from "@/components/LandCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShieldCheck, Sparkles, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function PublicVerifyPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  // Load all initial verified lands so UI is instantly useful
  const { data: initialLands = [], isLoading, refetch } = useQuery({
    queryKey: ["public-lands"],
    queryFn: async () => {
      const res = await api.get("/lands");
      return res.data.data || [];
    },
  });

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResult(null);
      return;
    }

    try {
      setIsSearching(true);
      setSearchResult(null);

      // Numeric ID lookup
      if (!isNaN(searchTerm)) {
        try {
          const res = await api.get(`/lands/${searchTerm.trim()}`);
          if (res.data.data) {
            setSearchResult([res.data.data]);
            return;
          }
        } catch {
          // Fall through
        }
      }

      // Text search
      const searchRes = await api.get(`/lands?search=${encodeURIComponent(searchTerm.trim())}`);
      if (searchRes.data.data && searchRes.data.data.length > 0) {
        setSearchResult(searchRes.data.data);
      } else {
        toast.info("No matching land parcels found.");
        setSearchResult([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResult(null);
  };

  const displayedLands = searchResult !== null ? searchResult : initialLands;

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
      {/* Compact Minimal Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-1 border-b border-border/60">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-foreground tracking-tight">Public Land Registry</h1>
          <Badge variant="outline" dot dotColor="bg-emerald-500" className="text-[10px] font-mono py-0.5">
            Ethereum Verified
          </Badge>
          <span className="text-xs text-muted-foreground font-mono hidden md:inline">
            ({displayedLands.length} Records)
          </span>
        </div>

        {/* Minimal Search & Quick Filter Input */}
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClear={clearSearch}
              placeholder="Search ID, Survey #, or Location..."
              startIcon={Search}
              className="h-9 w-64 md:w-80 text-xs bg-card/80 border-border/80 shadow-2xs font-medium"
            />
            <Button
              type="submit"
              size="sm"
              variant="glow"
              isLoading={isSearching}
              className="h-9 px-4 text-xs font-bold"
            >
              Search
            </Button>
          </form>

          {searchResult !== null && (
            <Button
              size="sm"
              variant="outline"
              onClick={clearSearch}
              className="h-9 text-xs font-semibold"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Suggested Quick Filter Chips - Slim row */}
      <div className="flex items-center gap-2 text-xs shrink-0 px-1 overflow-x-auto py-0.5">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Quick:</span>
        {["1", "SN-MH-2024", "Plot 104", "Green Valley"].map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => {
              setSearchTerm(tag);
              handleSearch();
            }}
            className="text-[11px] font-mono bg-card hover:bg-primary hover:text-primary-foreground text-foreground px-2 py-0.5 rounded-md border border-border/70 shadow-2xs transition-colors shrink-0 font-medium"
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Main Single-View Content Grid (Scrolls inside container if overflow, layout stays fixed) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-muted/40 animate-pulse border border-border/60" />
            ))}
          </div>
        ) : displayedLands.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-border/70 rounded-2xl text-center p-8 space-y-2">
            <Search className="w-8 h-8 text-muted-foreground/60" />
            <p className="text-sm font-semibold text-foreground">No land records found</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {searchResult !== null
                ? "No matching registry entries found for your query. Try resetting filters."
                : "No parcels currently registered on the smart contract."}
            </p>
            {searchResult !== null && (
              <Button size="sm" variant="outline" onClick={clearSearch} className="mt-2 text-xs">
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
            {displayedLands.map((land) => (
              <LandCard key={land.landId} land={land} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
