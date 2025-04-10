"use client";

import { useEffect, useState } from "react";
import {
  useActiveAccount,
  useReadContract,
  useSendTransaction,
} from "thirdweb/react";
import { prepareContractCall, readContract } from "thirdweb";
import {
  bondMarketPlaceContract,
  coinContract,
  bondContract,
} from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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

          if (
            data &&
            data[0] !== "0x0000000000000000000000000000000000000000" &&
            !data[3]
          ) {
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
          console.warn(`Failed to fetch bond #${i}`, err);
        }
      }
      setBonds(result);
    }
    fetchListedBonds();
  }, [totalListedBonds]);

  const selectedBond = bonds.find(
    (b) => b.index.toString() === selectedBondIndex
  );

  const handlePurchase = async () => {
    if (!account || !selectedBond) {
      toast({
        title: "Wallet not connected or bond not selected",
        variant: "destructive",
      });
      return;
    }

    const amount = Number(purchaseAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    setIsPurchasing(true);
    setTransactionHash(null);

    try {
      const bondAddress = await readContract({
        contract: bondContract,
        method: "function bondIdToAddress(uint256) view returns (address)",
        params: [BigInt(selectedBond.index)],
      });

      const fractionData = await readContract({
        contract: { ...bondContract, address: bondAddress as `0x${string}` },
        method:
          "function fractionInfo() view returns (uint256,uint256,uint256,uint256)",
        params: [],
      });

      const bondInternalTokenPrice = BigInt(fractionData[0]);
      const tokensPerBond = BigInt(fractionData[1]);
      const requiredCost =
        bondInternalTokenPrice * tokensPerBond * BigInt(amount);

      const approveTx = prepareContractCall({
        contract: coinContract,
        method: "function approve(address,uint256)",
        params: [bondMarketPlaceContract.address, requiredCost],
      });

      await new Promise<void>((resolve, reject) => {
        sendTransaction(approveTx, {
          onSuccess: () => resolve(),
          onError: (error) => {
            toast({ title: "Approval failed", description: String(error), variant: "destructive" });
            reject(error);
          },
        });
      });

      const purchaseTx = prepareContractCall({
        contract: bondMarketPlaceContract,
        method: "function purchaseBond(uint256,uint256)",
        params: [BigInt(selectedBond.index), BigInt(amount)],
      });

      await new Promise<void>((resolve, reject) => {
        sendTransaction(purchaseTx, {
          onSuccess: (receipt) => {
            if (receipt.transactionHash) {
              setTransactionHash(receipt.transactionHash);
            }
            resolve();
          },
          onError: (error) => {
            toast({ title: "Purchase failed", description: String(error), variant: "destructive" });
            reject(error);
          },
        });
      });

      toast({
        title: "Purchase successful",
        description: transactionHash ? (
          <a
            href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
            target="_blank"
            className="underline text-blue-600"
          >
            View on Etherscan
          </a>
        ) : undefined,
      });

      setPurchaseAmount("");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || String(err),
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 lg:px-8 py-12">
      {/* 标题区 */}
      <section className="text-center mb-16">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 animate-fade-in">
          Trade Bonds
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto relative inline-block after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-[2px] after:bg-purple-400 after:rounded-full">
          Select a bond and purchase
        </p>
      </section>

      {/* 卡片表单 */}
      <section className="max-w-md mx-auto bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-6">
        {/* Select Bond */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Bond
          </label>
          <select
            value={selectedBondIndex}
            onChange={(e) => setSelectedBondIndex(e.target.value)}
            className="block w-full p-3 border border-gray-300 rounded-md text-gray-800"
          >
            <option value="">-- Choose a Bond --</option>
            {bonds.map((bond) => (
              <option key={bond.index} value={bond.index.toString()}>
                Bond #{bond.index} - {bond.price} USDC
              </option>
            ))}
          </select>
        </div>

        {/* Bond Info */}
        {selectedBond && (
          <div className="text-sm text-gray-600 mb-4 space-y-1">
            <p><strong>Price:</strong> {selectedBond.price} USDC</p>
            <p><strong>Listed:</strong> {selectedBond.listingTime}</p>
            <p><strong>Status:</strong>{" "}
              {selectedBond.isMatured ? "Matured" : "Active"}
            </p>
          </div>
        )}

        {/* Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <Input
            type="number"
            min="1"
            value={purchaseAmount}
            onChange={(e) => setPurchaseAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        {/* Estimated Cost */}
        {selectedBond && purchaseAmount && (
          <p className="text-sm text-indigo-600 mb-4">
            Estimated Cost:{" "}
            {(selectedBond.price * Number(purchaseAmount)).toFixed(2)} USDC
          </p>
        )}

        {/* Wallet */}
        <div className="text-sm text-gray-600 mb-4">
          <strong>Wallet:</strong>{" "}
          {account?.address
            ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
            : "Not connected"}
        </div>

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={isPurchasing || !account}
          className="w-full transition-all duration-150 hover:scale-[1.02]"
        >
          {isPurchasing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : (
            "Purchase"
          )}
        </Button>

        {/* Tx Hash */}
        {transactionHash && (
          <p className="mt-4 text-sm text-blue-600 break-all text-center">
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View Transaction on Etherscan
            </a>
          </p>
        )}
      </section>
    </div>
  );
}
