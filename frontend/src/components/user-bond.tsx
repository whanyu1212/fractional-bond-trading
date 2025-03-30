"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BondForm } from "@/components/bond-form";
import { Loader2, PlusCircle, ChevronRight } from "lucide-react";
import { bondContract } from "@/constants/contract";


// Define Bond type
interface Bond {
  index: number;
  bondAddress: string;
  name: string;
  symbol: string;
  bondId: string;
  faceValue: number;
  couponRate: number;
  couponFrequency: number;
  maturityDate: string;
  issuer: string;
  stablecoinAddress: string;
  tokensPerBond: number;
  tokenPrice: number;
  maxBondSupply: number;
  creationTimestamp: number;
}

export function UserBonds() {
  const account = useActiveAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [userBonds, setUserBonds] = useState<Bond[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get all bonds by issuer
  const { data: bondIds, isPending: isLoadingBondIds } = useReadContract({
    contract: bondContract,
    method: "function getBondsByIssuer(address issuer) view returns (uint256[])",
    params: [account?.address ?? ''],
  });

  // Format number to avoid scientific notation and display in a readable way
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    } else if (num < 0.01 && num > 0) {
      // Handle very small numbers
      return num.toFixed(8);
    } else {
      return num.toFixed(2);
    }
  };

  // Fetch bond details for each bond ID
  useEffect(() => {
    const fetchBondDetails = async () => {
      if (!bondIds || bondIds.length === 0 || !account) {
        setIsLoading(false);
        return;
      }

      try {
        const bondDetailsPromises = bondIds.map(async (bondId, idx) => {
          const details = await readContract({
            contract: bondContract,
            method: "function getActiveBondDetailsByBondId(uint256 bondId) view returns (address bondAddress, string name, string symbol, uint256 returnBondId, uint256 faceValue, uint256 couponRate, uint256 couponFrequency, uint256 maturityDate, address issuer, address stablecoinAddress, uint256 tokensPerBond, uint256 tokenPrice, uint256 maxBondSupply, uint256 creationTimestamp)",
            params: [bondId],
          });

          // Return Bond object with correct types and proper decimal handling
          return {
            index: idx,
            bondAddress: details[0],
            name: details[1],
            symbol: details[2],
            bondId: details[3].toString(),
            faceValue: Number(details[4]) / 1e6, // Correct decimals for USDC
            couponRate: Number(details[5]), // Store as basis points
            couponFrequency: Number(details[6]),
            maturityDate: new Date(Number(details[7]) * 1000).toISOString(),
            issuer: details[8],
            stablecoinAddress: details[9],
            tokensPerBond: Number(details[10]),
            tokenPrice: Number(details[11]), // Correct decimals for USDC
            maxBondSupply: Number(details[12]), // Correct decimals for USDC
            creationTimestamp: Number(details[13])
          };
        });

        const bondDetails = await Promise.all(bondDetailsPromises);
        setUserBonds(bondDetails);
      } catch (error) {
        console.error("Error fetching bond details:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (account && bondIds) {
      fetchBondDetails();
    }
  }, [bondIds, account]);

  const handleCreateSuccess = (newBond: any) => {
    // This function would be called after successfully creating a bond
    setIsOpen(false);
    // In a real implementation, you'd refresh the bond data
  };

  // Format date to locale string
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (error) {
      return "Invalid Date";
    }
  };

  // Calculate days until maturity
  const getDaysUntilMaturity = (dateString: string): number => {
    try {
      const maturityDate = new Date(dateString);
      const now = new Date();
      const diffTime = maturityDate.getTime() - now.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch (error) {
      return 0;
    }
  };

  // Format address for display
  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">My Issued Bonds</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-4 w-4" />
              Create Bond
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create a New Bond</DialogTitle>
            </DialogHeader>
            <BondForm onSuccess={handleCreateSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading || isLoadingBondIds ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-blue-500">Loading your bonds...</span>
        </div>
      ) : userBonds.length > 0 ? (
        <div className="space-y-3">
          {userBonds.map((bond) => (
            <Card 
              key={bond.index} 
              className="overflow-hidden border-l-4 border-l-blue-500 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/4 bg-blue-50 p-4">
                  <div className="flex flex-col h-full justify-center">
                    <h3 className="font-bold text-blue-800">{bond.name}</h3>
                    <p className="text-sm text-blue-600 mt-1">Symbol: {bond.symbol}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge className="w-fit bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {(bond.couponRate / 100).toFixed(2)}% Coupon
                      </Badge>
                      {getDaysUntilMaturity(bond.maturityDate) <= 30 && (
                        <Badge className="w-fit bg-amber-100 text-amber-800 hover:bg-amber-200">
                          {getDaysUntilMaturity(bond.maturityDate)} Days to Maturity
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="md:w-1/2 p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="text-sm">
                      <span className="text-gray-500">Face Value:</span>
                      <span className="ml-2 font-medium">{bond.faceValue} USDC</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Coupon Frequency:</span>
                      <span className="ml-2 font-medium">
                      {bond.couponFrequency === 1 ? 'Annual' : 
                       bond.couponFrequency === 2 ? 'Semi-annual' : 
                       bond.couponFrequency === 4 ? 'Quarterly' : 
                       bond.couponFrequency === 12 ? 'Monthly' : 
                       `${bond.couponFrequency} times per year`}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Maturity:</span>
                      <span className="ml-2 font-medium">{formatDate(bond.maturityDate)}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 font-medium">{new Date(bond.creationTimestamp * 1000).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Token Price:</span>
                      <span className="ml-2 font-medium">{bond.tokenPrice} USDC</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Max Supply:</span>
                      <span className="ml-2 font-medium">{bond.maxBondSupply} Bonds</span>
                    </div>
                  </div>
                </div>
                
                <div className="md:w-1/4 p-4 flex items-center justify-center border-l border-blue-100">
                  <Button 
                    variant="outline" 
                    className="w-full h-10 border-blue-400 text-blue-600 hover:bg-blue-50 hover:text-blue-800 font-medium rounded-md shadow-sm transition-all hover:shadow hover:border-blue-500"
                  >
                    Edit Bond
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-700 mb-4">You haven't issued any bonds yet.</p>
          <Button 
            onClick={() => setIsOpen(true)} 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            Create Your First Bond
          </Button>
        </div>
      )}
    </div>
  );
}