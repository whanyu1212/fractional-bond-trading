"use client";


import { BondCard } from "@/components/bond-card";
import { UserBonds } from "@/components/user-bond";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useReadContract } from "thirdweb/react";
import { prepareContractCall, sendTransaction } from "thirdweb";
import Image from "next/image";
import { toast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { coinContract, mockStableCoinAddress } from "@/constants/contract";




export default function Account() {


  const account = useActiveAccount();
  const [amount, setAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // Get user's balance
  const { data: balance, isPending: isBalanceLoading } = useReadContract({
    contract: coinContract,
    method: "function balanceOf(address account) view returns (uint256)",
    params: [account?.address ??''],
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




        <div className="container mx-auto  py-6">
          <div className="flex flex-col space-y-2 mb-8">
            <h1 className="text-4xl font-extrabold text-black-600 tracking-tight sm:text-5xl">
              Your Dashboard
            </h1>
            <p className="mt-3 text-xl text-gray-600">
              Manage your bonds and view your all upcoming payments
            </p>
          </div>

          <div className="my-10 py-1">
            <div className="border-t border-gray-100"></div>
          </div>
          {/* Mockcoin Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Balance Card */}
            <div className="bg-blue-50 rounded-2xl p-6 shadow-lg border border-blue-100 h-full">
            <div className="flex items-center justify-between">
                <div>
                <h2 className="text-2xl font-semibold text-blue-700">Your Balance</h2>
                <p className="text-sm text-gray-600">Available tokens</p>
                </div>
                <div className="h-16 w-16 bg-blue-500 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                </div>
            </div>
            <div className="mt-6">
                {isBalanceLoading ? (
                <div className="animate-pulse h-10 bg-blue-100 rounded"></div>
                ) : (
                <div className="flex items-baseline">
                    <span className="text-5xl font-bold text-blue-700">
                    {balance ? balance.toString() : '0'}
                    </span>
                    <span className="ml-2 text-lg text-gray-600">tokens</span>
                </div>
                )}
                <p className="mt-2 text-sm text-gray-500">
                Connected wallet: {account?.address ? 
                    `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}` : 
                    'Not connected'}
                </p>
            </div>
            </div>
            

            {/* Mint Coins Form */}
            <div className="bg-blue-50 rounded-2xl p-6 shadow-lg border border-blue-100 h-full flex flex-col">
            <h2 className="text-2xl font-semibold text-blue-700 mb-6">Mint Coins</h2>
            
            <div className="space-y-4 flex-grow">
                <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
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
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

            {/* Transaction Result Modal */}
            {showResult && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-blue-700">Transaction Result</h3>
                    <button 
                        onClick={() => setShowResult(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4 mb-4 overflow-auto max-h-96">
                    <p className="text-green-600 mb-2 text-lg font-semibold">Status: {transactionResult?.status || "Success"}</p>
                    <p className="text-gray-700 mb-2">
                        <span className="font-semibold">Transaction Hash:</span>{' '}
                        <span className="text-blue-600 break-all">{transactionResult?.transactionHash || "Not available"}</span>
                    </p>
                    {/* <p className="text-gray-700 mb-2">
                        <span className="font-semibold">Block Number:</span>{' '}
                        <span>{transactionResult?.blockNumber || "Pending"}</span>
                    </p>
                    <p className="text-gray-700 mb-2">
                        <span className="font-semibold">Gas Used:</span>{' '}
                        <span>{transactionResult?.gasUsed || "Calculating"}</span>
                    </p> */}
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
          </div>
          {/* divider */}
          <div className="my-10 py-1">
            <div className="border-t border-gray-100"></div>
          </div>
          
          {/* Bonds */}
          <div className="container mx-auto py-6">
        
          <Tabs defaultValue="my-bonds" className="space-y-6">
            <TabsList className="bg-white-100 border border-black-200">
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
                <h2 className="text-xl font-semibold mb-4 text-blue-900">Available Bonds</h2>
                <BondCard />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

     
    </div>
  );
}