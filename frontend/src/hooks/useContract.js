import { useMemo } from "react";
import { ethers } from "ethers";
import contractArtifact from "../contracts/LandRegistry.json";

const PLACEHOLDER_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

export function useContract(signerOrProvider) {
  const contract = useMemo(() => {
    if (!signerOrProvider) return null;

    const envAddress = (import.meta.env.VITE_CONTRACT_ADDRESS || "").trim();
    const address =
      envAddress && envAddress.toLowerCase() !== PLACEHOLDER_ADDRESS
        ? envAddress
        : contractArtifact.contractAddress;

    if (!address || address === "0x0000000000000000000000000000000000000000") {
      console.warn("Contract address not configured.");
      return null;
    }

    return new ethers.Contract(address, contractArtifact.abi, signerOrProvider);
  }, [signerOrProvider]);

  return contract;
}

