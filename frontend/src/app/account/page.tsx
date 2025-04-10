"use client";

import { useState } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { coinContract, bondContract } from "@/constants/contract";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserBonds } from "@/components/user-bond";
import { UserPurchases } from "@/components/user-purchase";
import { Loader2 } from "lucide-react";

export default function Account() {
  const account = useActiveAccount();
  const [amount, setAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  const { data: balance, isPending: isBalanceLoading } = useReadContract({
    contract: coinContract,
    method: "function balanceOf(address account) view returns (uint256)",
    params: [account?.address ?? ""],
  });

  const { data: bondsData } = useReadContract({
    contract: bondContract,
    method: "function getBondsByIssuer(address issuer) view returns (Bond[] memory)",
    params: [account?.address ?? ""],
  });

  const handleMintCoins = async () => {
    if (!account || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount to mint",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsMinting(true);
      const transaction = await prepareContractCall({
        contract: coinContract,
        method: "function mint(address to, uint256 amount)",
        params: [account.address, BigInt(amount)],
      });
      const result = await sendTransaction({ transaction, account });
      setTransactionResult(result);
      setShowResult(true);
      setAmount("");
      toast({ title: "Coins minted successfully!" });
    } catch (error) {
      console.error("Mint error:", error);
      toast({ title: "Failed to mint coins", variant: "destructive" });
    } finally {
      setIsMinting(false);
    }
  };

  const formattedBalance = balance
    ? new Intl.NumberFormat().format(Number(balance.toString()))
    : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster />

      <div className="container mx-auto py-12 px-4">
        {/* Page Header */}
        <section className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 animate-fade-in">
            Your Dashboard
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto relative inline-block after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-[2px] after:bg-purple-400 after:rounded-full">
            Manage your bonds and payments
          </p>
        </section>

        {/* Balance + Mint */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Balance */}
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-blue-700">Your Balance</h2>
              <div className="bg-blue-600 text-white p-3 rounded-full">
                💰
              </div>
            </div>
            {isBalanceLoading ? (
              <div className="animate-pulse h-10 bg-blue-100 rounded" />
            ) : (
              <p className="text-4xl font-extrabold text-blue-700 mb-2">
                {formattedBalance}
                <span className="text-lg font-medium text-gray-500 ml-2">tokens</span>
              </p>
            )}
            <p className="text-sm text-gray-500">
              Connected wallet:{" "}
              {account?.address
                ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                : "Not connected"}
            </p>
          </div>

          {/* Mint */}
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-blue-700 mb-6">Mint Coins</h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleMintCoins}
                disabled={isMinting || !account}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex justify-center items-center gap-2 transition-all duration-150"
              >
                {isMinting ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4" />
                    Minting...
                  </>
                ) : (
                  "Mint Coins"
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Tabs: My Bonds / My Purchases */}
        <section>
          <Tabs defaultValue="my-bonds" className="space-y-6">
            <TabsList className="bg-white border rounded-lg border-gray-200 shadow">
              <TabsTrigger
                value="my-bonds"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                My Bonds
              </TabsTrigger>
              <TabsTrigger
                value="purchases"
                className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
              >
                My Purchases
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-bonds" className="bg-white/80 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow">
              <UserBonds />
            </TabsContent>

            <TabsContent value="purchases" className="bg-white/80 backdrop-blur-md border border-white/30 rounded-xl p-6 shadow">
              <UserPurchases />
            </TabsContent>
          </Tabs>
        </section>

        {/* Mint Transaction Result Modal */}
        {showResult && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold text-blue-700 mb-4">
                Transaction Result
              </h3>
              <div className="space-y-2">
                <p className="text-green-600 font-medium">
                  Status: {transactionResult?.status ?? "Success"}
                </p>
                <p className="text-sm break-all text-gray-600">
                  Tx Hash:{" "}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${transactionResult?.transactionHash}`}
                    className="text-blue-600 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {transactionResult?.transactionHash}
                  </a>
                </p>
              </div>
              <div className="mt-6 text-right">
                <button
                  onClick={() => setShowResult(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
