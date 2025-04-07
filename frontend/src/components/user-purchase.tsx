"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight } from "lucide-react";
import { bondMarketPlaceContract } from "@/constants/contract";
import ExchangeBond from "@/components/exchange-bond";

// Updated Bond interface to match the actual returned data
interface Bond {
  bondId: number;
  issuer: string;
  maturityDate: number;
  isActive: boolean;
  amountInCirculation: number;
  name: string;
  symbol: string;
  faceValue: number;
  couponRate: number;
  couponFrequency: number;
  creationTimestamp: number;
  stablecoinAddress: string;
  tokensPerBond: number;
  tokenPrice: number;
  maxBondSupply: number;
  maxFundingAmount: number;
  creationBlock: number;
  bondAddress: string;
  // Derived fields for display
  maturityDateStr?: string;
  daysUntilMaturity?: number;
}

export function UserPurchases() {
  const account = useActiveAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [exchangeModalOpen, setExchangeModalOpen] = useState(false);
  const [selectedBondId, setSelectedBondId] = useState<number | null>(null);

  // Get all bonds by issuer
  const { data, isPending: isLoadingBondIds } = useReadContract({
    contract: bondMarketPlaceContract,
    method: "function getActualUserHoldingsWithDetails(address user) view returns (uint256[], address[], uint256[])",
    params: [account?.address ?? ''],
  });
  const bondIds = data?.[0] ?? [];
  const issuerAddresses = data?.[1] ?? [];
  const amounts = data?.[2] ?? [];

  // Set loading to false after bondIds are fetched
  useEffect(() => {
    if (!isLoadingBondIds) {
      setIsLoading(false);
    }
  }, [isLoadingBondIds]);

  // Format address for display
  const formatAddress = (address: string): string => {
    if (!address) return "Unknown";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle exchange button click
  const handleExchangeClick = (bondId: number) => {
    setSelectedBondId(bondId);
    setExchangeModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setExchangeModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-500 mb-4">
        {bondIds && bondIds.length > 0 ? ` | Total Bonds: ${bondIds.length} |` : ""} 
        {account && bondIds && bondIds.length > 0 ? ` | Your Address: ${formatAddress(account.address)} |` : ""}
        {account && bondIds && bondIds.length > 0 ? ` | Bond IDs: ${bondIds.join(", ")} |` : ""}
      </p>

      {isLoading || isLoadingBondIds ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-blue-500">Loading your bonds...</span>
        </div>
      ) : bondIds && bondIds.length > 0 ? (
        <div className="space-y-3">
          {bondIds.map((bondId, index) => (
            <Card key={bondId} className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      Bond ID: {bondId.toString()}
                    </CardTitle>
                    <CardDescription>Issuer: {formatAddress(issuerAddresses[index] || "")}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                    Amount: {amounts[index]?.toString() || "0"}
                  </Badge>
                </div>
              </CardHeader>
              <CardFooter className="bg-gray-50 border-t flex justify-between items-center p-3">
                <div>
                  <p className="text-xs text-gray-500">Created by: {formatAddress(issuerAddresses[index] || "")}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="flex gap-2 items-center bg-gradient-to-r from-green-50 to-green-100 border-green-300 hover:bg-green-200 hover:border-green-400 transition-colors duration-200 text-green-700 font-medium px-4 py-2 rounded-md shadow-sm"
                  onClick={() => handleExchangeClick(Number(bondId))}
                >
                  <span>Exchange Bond</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-700 mb-4">You haven't purchased any bonds yet.</p>
        </div>
      )}

      {/* Exchange Bond Component */}
      {selectedBondId !== null && account && (
        <ExchangeBond
          isOpen={exchangeModalOpen}
          onClose={handleModalClose}
          bondId={selectedBondId}
          fromAddress={account.address}
        />
      )}
    </div>
  );
}