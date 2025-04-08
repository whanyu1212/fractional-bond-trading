"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { prepareContractCall, readContract } from "thirdweb";
import {
  bondMarketPlaceContract,
  coinContract,
  bondContract,
} from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";

const DECIMALS = 6;

interface Bond {
  index: number;
  issuer: string;
  price: number;
  listingTime: string;
  isMatured: boolean;
  totalHolders: number;
}

export default function TradePage() {
  const account = useActiveAccount();
  // Removed useNetwork as it is not exported from "thirdweb/react"
  const { mutate: sendTransaction } = useSendTransaction();

  const [bonds, setBonds] = useState<Bond[]>([]);
  const [selectedBondIndex, setSelectedBondIndex] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  const { data: totalListedBonds } = useReadContract({
    contract: bondMarketPlaceContract,
    method: "function totalListedBonds() view returns (uint256)",
    params: [],
  });

  useEffect(() => {
    async function fetchListedBonds() {
      if (!totalListedBonds) return;
      const count = Number(totalListedBonds);
      const result: Bond[] = [];

      for (let i = 0; i < count; i++) {
        try {
          const data = await readContract({
            contract: bondMarketPlaceContract,
            method:
              "function getBondInfo(uint256 index) view returns (address issuer, uint256 price, uint256 listingTime, bool isMatured, uint256 totalHolders)",
            params: [BigInt(i)],
          });

          if (data && data[0] !== "0x0000000000000000000000000000000000000000" && !data[3]) {
            result.push({
              index: i,
              issuer: data[0],
              price: Number(data[1]) / 10 ** DECIMALS,
              listingTime: new Date(Number(data[2]) * 1000).toLocaleDateString(),
              isMatured: data[3],
              totalHolders: Number(data[4]),
            });
          }
        } catch (err) {
          console.warn(`❌ Failed to fetch bond #${i}`, err);
        }
      }
      setBonds(result);
    }
    fetchListedBonds();
  }, [totalListedBonds]);

  const selectedBond = bonds.find((b) => b.index.toString() === selectedBondIndex);

  const handlePurchase = async () => {
    if (!account || !selectedBond) {
      toast({ title: "Wallet not connected or bond not selected", variant: "destructive" });
      return;
    }

    const amount = Number(purchaseAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    try {
      setIsPurchasing(true);
      setTransactionHash(null);

      console.log("🔍 Wallet address:", account.address);
      console.log("🧠 Bond index:", selectedBond.index);

      const bondAddress = await readContract({
        contract: bondContract,
        method: "function bondIdToAddress(uint256) view returns (address)",
        params: [BigInt(selectedBond.index)],
      });

      const fractionData = await readContract({
        contract: { ...bondContract, address: bondAddress as `0x${string}` },
        method: "function fractionInfo() view returns (uint256,uint256,uint256,uint256)",
        params: [],
      });

      const bondInternalTokenPrice = BigInt(fractionData[0]);
      const tokensPerBond = BigInt(fractionData[1]);
      const requiredCost = bondInternalTokenPrice * tokensPerBond * BigInt(amount);

      console.log("🏛️ Bond Contract Address:", bondAddress);
      console.log("💰 bondInternalTokenPrice:", bondInternalTokenPrice.toString());
      console.log("📦 tokensPerBond:", tokensPerBond.toString());
      console.log("📉 requiredCost:", requiredCost.toString());

      const approveTx = prepareContractCall({
        contract: coinContract,
        method: "function approve(address,uint256)",
        params: [bondAddress, requiredCost],
      });

      sendTransaction(approveTx, {
        onSuccess: (approveReceipt) => {
          console.log("🟢 Approve txHash:", approveReceipt.transactionHash);

          const purchaseTx = prepareContractCall({
            contract: bondMarketPlaceContract,
            method: "function purchaseBond(uint256,uint256)",
            params: [BigInt(selectedBond.index), BigInt(amount)],
          });

          sendTransaction(purchaseTx, {
            onSuccess: (receipt) => {
              console.log("✅ purchaseBond receipt:", receipt);
              const txLink = `https://sepolia.etherscan.io/tx/${receipt.transactionHash}`;
              toast({
                title: "Purchase successful",
                description: <a href={txLink} target="_blank" className="underline text-blue-600">View on Etherscan</a>,
              });
              setTransactionHash(receipt.transactionHash);
              setPurchaseAmount("");
            },
            onError: (err) => {
              console.error("❌ purchase TX failed", err);
              toast({ title: "Purchase failed", description: String(err), variant: "destructive" });
            },
          });
        },
        onError: (err) => {
          console.error("❌ approve TX failed", err);
          toast({ title: "Approval failed", description: String(err), variant: "destructive" });
        },
      });
    } catch (err: any) {
      console.error("purchaseBond failed:", err);
      toast({ title: "Error", description: err.message || String(err), variant: "destructive" });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-800">Trade Bonds</h1>
          <p className="text-gray-600 text-lg mt-2">Select a bond and purchase</p>
        </div>
        <div className="max-w-md mx-auto bg-white rounded-xl p-6 shadow-lg border">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Bond</label>
            <select
              value={selectedBondIndex}
              onChange={(e) => setSelectedBondIndex(e.target.value)}
              className="block w-full p-3 border border-gray-300 rounded-md"
            >
              <option value="">-- Choose a Bond --</option>
              {bonds.map((bond) => (
                <option key={bond.index} value={bond.index.toString()}>
                  Bond No.{bond.index} - {bond.price} USDC
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <Input
              type="number"
              min="1"
              value={purchaseAmount}
              onChange={(e) => setPurchaseAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <div className="text-sm text-gray-600 mb-4">
            <strong>Wallet:</strong> {account?.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Not connected"}
          </div>
          <Button onClick={handlePurchase} disabled={isPurchasing || !account} className="w-full">
            {isPurchasing ? "Purchasing..." : "Purchase"}
          </Button>
          {transactionHash && (
            <p className="mt-4 text-xs text-blue-500 break-all">
              View on Etherscan: <a href={`https://sepolia.etherscan.io/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer" className="underline">{transactionHash}</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
