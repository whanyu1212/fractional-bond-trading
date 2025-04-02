"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bondContract } from "@/constants/contract";

// Define the Bond type based on your contract's returned data.
type Bond = {
  index: number;
  bondAddress: string;
  name: string;
  symbol: string;
  issuer: string;
  maturityDate: string;
  faceValue: number;
};

export default function Trade() {
  const account = useActiveAccount();

  // Number of bonds to check. Adjust as needed.
  const numberOfBonds = 8;

  // Create an array of contract read hooks for each bond index.
  const bondRequests = Array.from({ length: numberOfBonds }, (_, i) =>
    useReadContract({
      contract: bondContract,
      method:
        "function getActiveBondDetailsByIndex(uint256 index) view returns (address bondAddress, string name, string symbol, address issuer, uint256 maturityDate, uint256 faceValue)",
      params: [BigInt(i)],
    })
  );

  // State to hold the available bonds.
  const [availableBonds, setAvailableBonds] = useState<Bond[]>([]);

  // Process the bond requests once all are loaded.
  useEffect(() => {
    const allLoaded = bondRequests.every((req) => !req.isPending);
    if (allLoaded) {
      const bondsList: Bond[] = bondRequests
        .map((req, i) => {
          if (req.data) {
            return {
              index: i,
              bondAddress: req.data[0],
              name: req.data[1],
              symbol: req.data[2],
              issuer: req.data[3],
              maturityDate: new Date(Number(req.data[4]) * 1000).toLocaleDateString(),
              faceValue: Number(req.data[5]) / 1e18, // Assuming 18 decimals
            };
          }
          return null;
        })
        .filter((bond): bond is Bond => bond !== null);
      setAvailableBonds(bondsList);
    }
  }, bondRequests.map((req) => req.isPending));

  // Trade form states.
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Handle the purchaseBonds call.
  const handlePurchaseBonds = async () => {
    if (!account) {
      toast({
        title: "No wallet connected",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedBond) {
      toast({
        title: "No bond selected",
        description: "Please select a bond from the dropdown.",
        variant: "destructive",
      });
      return;
    }
    if (!purchaseAmount || isNaN(Number(purchaseAmount)) || Number(purchaseAmount) <= 0) {
      toast({
        title: "Invalid purchase amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsPurchasing(true);
      // Prepare the purchaseBonds contract call.
      const transaction = await prepareContractCall({
        contract: bondContract,
        method: "function purchaseBonds(address bondAddress, address investor, uint256 bondAmount)",
        params: [
          selectedBond.bondAddress, // from the dropdown
          account.address, // current user's address
          BigInt(purchaseAmount),
        ],
      });
      const result = await sendTransaction({
        transaction,
        account,
      });
      setTransactionResult(result);
      setShowResultModal(true);
      toast({
        title: "Bonds purchased successfully!",
        variant: "default",
      });
      setPurchaseAmount("");
      setIsPurchasing(false);
    } catch (error) {
      console.error("Error purchasing bonds:", error);
      setIsPurchasing(false);
      toast({
        title: "Bond purchase failed",
        description: "See console for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster />
      <Navbar />

      <div className="container mx-auto py-10 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-800 sm:text-5xl">
            Trade Page
          </h1>
          <p className="mt-3 text-xl text-gray-600">
            Welcome to the Trade page!
          </p>
        </div>

        <div className="mt-12 max-w-md mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-xl border border-gray-200">
            <h2 className="text-2xl font-semibold text-blue-700 mb-6">
              Purchase Bonds
            </h2>

            {/* Dropdown for selecting an available bond */}
            <div className="mb-4">
              <label htmlFor="bondSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Select Bond (Contract Name)
              </label>
              <select
                id="bondSelect"
                value={selectedBond ? selectedBond.bondAddress : ""}
                onChange={(e) => {
                  const bond = availableBonds.find((b) => b.bondAddress === e.target.value) || null;
                  setSelectedBond(bond);
                }}
                className="block w-full p-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Choose a Bond --</option>
                {availableBonds.map((bond) => (
                  <option key={bond.bondAddress} value={bond.bondAddress}>
                    {bond.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Input for Bond Amount */}
            <div className="mb-4">
              <label htmlFor="purchaseAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Bond Amount
              </label>
              <Input
                id="purchaseAmount"
                type="number"
                min="1"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(e.target.value)}
                placeholder="Enter purchase amount"
                className="shadow-sm"
              />
            </div>

            {/* Display the Investor (current account) */}
            <div className="mb-6">
              <p className="text-sm text-gray-700">
                <strong>Investor Address:</strong>{" "}
                {account?.address
                  ? `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}`
                  : "Not connected"}
              </p>
            </div>

            {/* Purchase Button */}
            <Button
              onClick={handlePurchaseBonds}
              disabled={isPurchasing || !account}
              className="w-full py-3 text-base font-bold"
            >
              {isPurchasing ? "Purchasing..." : "Purchase Bonds"}
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6 border border-gray-200 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-700">Transaction Result</h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" 
                     viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M6 18L18 6M6 6l12 12" />
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
              <Button
                onClick={() => setShowResultModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
