"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useReadContract } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { BondCard } from "@/components/bond-card";
import { UserBonds } from "@/components/user-bond";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Import coinContract (for mint & balance) and bondContract (for bond actions)
import { coinContract, bondContract } from "@/constants/contract";

// Adjust Bond interface to include the bondAddress property
interface Bond {
  bondAddress: string; // The actual address of the bond contract
  name: string;
  // add other fields if needed (e.g. maturityDate, faceValue, etc.)
}

interface BondItemProps {
  bond: Bond;
  account: any; // Adjust type if you have a specific type for the account
}

// BondItem component now calls redeemBonds(bondAddress, investor) and transferBond(bondAddress, newOwner)
function BondItem({ bond, account }: BondItemProps) {
  // Transfer state
  const [newOwnerAddress, setNewOwnerAddress] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTxResult, setTransferTxResult] = useState<any>(null);
  const [showTransferResult, setShowTransferResult] = useState(false);

  // Redeem state
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemTxResult, setRedeemTxResult] = useState<any>(null);
  const [showRedeemResult, setShowRedeemResult] = useState(false);

  // Handle transferBond
  const handleTransferBond = async () => {
    if (!newOwnerAddress) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid new owner address",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsTransferring(true);
      const transaction = await prepareContractCall({
        contract: bondContract,
        method: "function transferBond(address bondAddress, address newOwner)",
        params: [bond.bondAddress, newOwnerAddress], // bondAddress from bond, newOwner from input
      });
      const result = await sendTransaction({
        transaction,
        account,
      });
      setTransferTxResult(result);
      setShowTransferResult(true);
      setIsTransferring(false);
      setNewOwnerAddress("");
      toast({
        title: "Bond transferred successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error transferring bond:", error);
      setIsTransferring(false);
      toast({
        title: "Failed to transfer bond",
        description: "See console for details",
        variant: "destructive",
      });
    }
  };

  // Handle redeemBonds
  const handleRedeemBond = async () => {
    try {
      setIsRedeeming(true);
      const transaction = await prepareContractCall({
        contract: bondContract,
        method: "function redeemBonds(address bondAddress, address investor)",
        params: [bond.bondAddress, account.address], // bondAddress from bond, investor is the user's address
      });
      const result = await sendTransaction({
        transaction,
        account,
      });
      setRedeemTxResult(result);
      setShowRedeemResult(true);
      setIsRedeeming(false);
      toast({
        title: "Bond redeemed successfully!",
        variant: "default",
      });
    } catch (error) {
      console.error("Error redeeming bond:", error);
      setIsRedeeming(false);
      toast({
        title: "Failed to redeem bond",
        description: "See console for details",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="border p-4 rounded-lg mb-4">
      <div>
        <p>
          <strong>Bond Address:</strong> {bond.bondAddress}
        </p>
        <p>
          <strong>Name:</strong> {bond.name}
        </p>
      </div>

      {/* Transfer & Redeem */}
      <div className="mt-2">
        {/* Transfer */}
        <input
          type="text"
          placeholder="New owner address"
          value={newOwnerAddress}
          onChange={(e) => setNewOwnerAddress(e.target.value)}
          className="border p-2 rounded mb-2 w-full"
        />
        <button
          onClick={handleTransferBond}
          disabled={isTransferring}
          className="bg-blue-600 text-white p-2 rounded w-full mb-2"
        >
          {isTransferring ? "Transferring..." : "Transfer Bond"}
        </button>

        {/* Redeem */}
        <button
          onClick={handleRedeemBond}
          disabled={isRedeeming}
          className="bg-green-600 text-white p-2 rounded w-full"
        >
          {isRedeeming ? "Redeeming..." : "Redeem Bond"}
        </button>
      </div>

      {/* Transfer Result */}
      {showTransferResult && (
        <div className="mt-2 p-2 border rounded bg-gray-100">
          <p>Transfer Status: {transferTxResult?.status || "Success"}</p>
          <p>Tx Hash: {transferTxResult?.transactionHash || "N/A"}</p>
          <button
            onClick={() => setShowTransferResult(false)}
            className="text-blue-600 underline"
          >
            Close
          </button>
        </div>
      )}

      {/* Redeem Result */}
      {showRedeemResult && (
        <div className="mt-2 p-2 border rounded bg-gray-100">
          <p>Redeem Status: {redeemTxResult?.status || "Success"}</p>
          <p>Tx Hash: {redeemTxResult?.transactionHash || "N/A"}</p>
          <button
            onClick={() => setShowRedeemResult(false)}
            className="text-green-600 underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

export default function Account() {
  const account = useActiveAccount();

  // ------------------- MINT & BALANCE (coinContract) -------------------
  const [amount, setAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // Mint coins
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
      setIsMinting(false);
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
        variant: "destructive",
      });
    }
  };

  // Read user's coin balance
  const { data: balance, isPending: isBalanceLoading } = useReadContract({
    contract: coinContract,
    method: "function balanceOf(address account) view returns (uint256)",
    params: [account?.address ?? ""],
  });

  // ------------------- BOND READ & ACTIONS (bondContract) -------------------
  // Read bonds by issuer => returns array of { bondAddress, name, ... }
  const { data: bondsData, isPending: isBondsLoading } = useReadContract({
    contract: bondContract,
    method: "function getBondsByIssuer(address issuer) view returns (Bond[] memory)",
    params: [account?.address ?? ""],
  });

  // Convert the data to an array of Bond objects
  const bonds: Bond[] = (bondsData as Bond[]) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster />
      <Navbar />

      <div className="container mx-auto py-10 px-4">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-800 sm:text-5xl">
            Your Dashboard
          </h1>
          <p className="mt-3 text-xl text-gray-600">
            Manage your bonds and view all your upcoming payments
          </p>
        </div>

        <div className="my-10 py-1">
          <div className="border-t border-gray-100"></div>
        </div>

        {/* Grid for Balance and Mint Coins */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Balance Card */}
          <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-200 h-full">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-blue-700">
                  Your Balance
                </h2>
                <p className="text-sm text-gray-600">Available tokens</p>
              </div>
              <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="mt-6">
              {isBalanceLoading ? (
                <div className="animate-pulse h-10 bg-blue-100 rounded"></div>
              ) : (
                <div className="flex items-baseline">
                  <span className="text-5xl font-bold text-blue-700">
                    {balance ? balance.toString() : "0"}
                  </span>
                  <span className="ml-2 text-lg text-gray-600">tokens</span>
                </div>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Connected wallet:{" "}
                {account?.address
                  ? `${account.address.substring(0, 6)}...${account.address.substring(
                      account.address.length - 4
                    )}`
                  : "Not connected"}
              </p>
            </div>
          </div>

          {/* Mint Coins Form */}
          <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-200 h-full flex flex-col">
            <h2 className="text-2xl font-semibold text-blue-700 mb-6">
              Mint Coins
            </h2>
            <div className="space-y-4 flex-grow">
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Amount to Mint
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="1"
                  required
                />
              </div>
              <div className="pt-4 mt-auto">
                <button
                  onClick={handleMintCoins}
                  disabled={isMinting || !account}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMinting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Minting...
                    </>
                  ) : (
                    "Mint Coins"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Result Modal for Mint Coins */}
        {showResult && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6 border border-gray-200 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-blue-700">
                  Transaction Result
                </h3>
                <button
                  onClick={() => setShowResult(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 mb-4 overflow-auto max-h-96">
                <p className="text-green-600 mb-2 text-lg font-semibold">
                  Status: {transactionResult?.status || "Success"}
                </p>
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">Transaction Hash:</span>{" "}
                  <span className="text-blue-600 break-all">
                    {transactionResult?.transactionHash || "Not available"}
                  </span>
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowResult(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="my-10 py-1">
          <div className="border-t border-gray-100"></div>
        </div>

        {/* Bonds Section with Tabs */}
        <div className="py-6">
          <Tabs defaultValue="my-bonds" className="space-y-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger
                value="my-bonds"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:text-black-900"
              >
                My Bonds
              </TabsTrigger>
              <TabsTrigger
                value="market"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-none data-[state=inactive]:text-black-900"
              >
                My Purchases
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-bonds" className="space-y-6">
              <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-6">
                <UserBonds />
              </div>
            </TabsContent>

            <TabsContent value="market" className="space-y-6">
              <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-900">
                  My Bond Purchases
                </h2>
                {isBondsLoading ? (
                  <div>Loading bonds...</div>
                ) : bonds && bonds.length > 0 ? (
                  bonds.map((bond: Bond, index: number) => (
                    <BondItem key={index} bond={bond} account={account} />
                  ))
                ) : (
                  <p>No bonds found.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
