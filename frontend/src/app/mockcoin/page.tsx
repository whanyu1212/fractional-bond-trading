"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useReadContract } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { coinContract, mockStableCoinAddress } from "@/constants/contract";

export default function CoinPage() {
  const account = useActiveAccount();
  const [amount, setAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // Check if account exists
  if (!account) {
    toast({ title: "Please connect your wallet first", variant: "destructive" });
    return <div>
      <Toaster />
      <Navbar />
      <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="text-center p-8 rounded-lg bg-blue-50 shadow-md">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Wallet Connection Required</h2>
          <p className="text-gray-700 mb-6">Please connect your wallet to access the Coin Dashboard</p>
        </div>
      </div>
    </div>;
  }

  // Get user's balance
  const { data: balance, isPending: isBalanceLoading } = useReadContract({
    contract: coinContract,
    method: "function balanceOf(address account) view returns (uint256)",
    params: [account.address],
  });

  // Handle minting coins
  const handleMintCoins = async () => {
    if (!account || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({ 
        title: "Invalid amount", 
        description: "Please enter a valid amount to mint",
        variant: "destructive" 
      });
      return;
    }

    try {
      setIsMinting(true);
      
      const transaction = await prepareContractCall({
        contract: coinContract,
        method: "function mint(address to, uint256 amount)",
        params: [account.address, BigInt(amount)], // Using mockStableCoinAddress from constants
      });
      
      const result = await sendTransaction({
        transaction,
        account,
      });
      
      setTransactionResult(result);
      setShowResult(true);
      setIsMinting(false);
      
      // Reset form field after successful transaction
      setAmount("");
      
      toast({
        title: "Coins minted successfully!",
        variant: "default",
      });
      
    } catch (error) {
      console.error("Error minting coins:", error);
      setIsMinting(false);
      toast({ 
        title: "Failed to mint coins", 
        description: "See console for details",
        variant: "destructive" 
      });
    }
  };

  return (
    <div>
      <Toaster />
      <Navbar />

      <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">

       
      </div>
    </div>
    </div>
  );
}