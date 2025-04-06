"use client";

import { useEffect, useState } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { prepareContractCall, sendTransaction, readContract } from "thirdweb";
import { bondMarketPlaceContract, coinContract, bondContract } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";

const DECIMALS = 6;
const TOKENS_PER_BOND = 1000;

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
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [selectedBondIndex, setSelectedBondIndex] = useState<string>("");
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

      console.log("🔍 Total listed bonds:", count);

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
    if (!account) {
      toast({ title: "Wallet not connected", variant: "destructive" });
      return;
    }
    if (!selectedBond) {
      toast({ title: "No bond selected", variant: "destructive" });
      return;
    }
    const amount = Number(purchaseAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    try {
      setIsPurchasing(true);

      // Step 1: Calculate required stablecoin cost (tokenPrice * tokensPerBond * amount)
      const tokenPrice = selectedBond.price * 10 ** DECIMALS;
      const requiredCost = BigInt(tokenPrice * TOKENS_PER_BOND * amount);

      // Step 2: Get actual bond contract address from bondContract
      const bondAddress = await readContract({
        contract: bondContract,
        method: "function bondIdToAddress(uint256 bondId) view returns (address)",
        params: [BigInt(selectedBond.index)],
      });

      // Step 3: Approve stablecoin to bondAddress
      const approveTx = await prepareContractCall({
        contract: coinContract,
        method: "function approve(address spender, uint256 amount)",
        params: [bondAddress, requiredCost],
      });
      await sendTransaction({ transaction: approveTx, account });
      console.log("✅ approve successful");

      // Step 4: Purchase bond
      const purchaseTx = await prepareContractCall({
        contract: bondMarketPlaceContract,
        method: "function purchaseBond(uint256 bondId, uint256 amount)",
        params: [BigInt(selectedBond.index), BigInt(amount)],
      });
      const receipt = await sendTransaction({ transaction: purchaseTx, account });
      console.log("✅ purchase successful", receipt);
      setTransactionHash(receipt.transactionHash);
      toast({ title: "Purchase complete!", description: receipt.transactionHash });
      setPurchaseAmount("");
    } catch (err) {
      console.error("❌ Error purchasing bond:", err);
      toast({ title: "Purchase failed", description: String(err), variant: "destructive" });
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
            <strong>Wallet:</strong> {account?.address.slice(0, 6)}...{account?.address.slice(-4)}
          </div>
          <Button onClick={handlePurchase} disabled={isPurchasing} className="w-full">
            {isPurchasing ? "Purchasing..." : "Purchase"}
          </Button>
          {transactionHash && (
            <p className="mt-4 text-xs text-gray-500 break-all">Tx Hash: {transactionHash}</p>
          )}
        </div>
      </div>
    </div>
  );
}
