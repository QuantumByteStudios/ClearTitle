import { useMemo } from "react";
import { ethers } from "ethers";
import contractArtifact from "../contracts/LandRegistry.json";

export function useContract(signerOrProvider) {
  const contract = useMemo(() => {
    if (!signerOrProvider) return null;

    const address =
      import.meta.env.VITE_CONTRACT_ADDRESS ||
      contractArtifact.contractAddress;

    if (!address || address === "0x0000000000000000000000000000000000000000") {
      console.warn("Contract address not configured.");
      return null;
    }

    return new ethers.Contract(address, contractArtifact.abi, signerOrProvider);
  }, [signerOrProvider]);

  return contract;
}

