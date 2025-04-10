"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
// import { readContract } from "thirdweb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BondForm } from "@/components/bond-form";
import { Loader2, PlusCircle, ChevronRight, CheckCircle } from "lucide-react";
import { bondContract } from "@/constants/contract";
import { 
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";


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

export function UserBonds() {
  const account = useActiveAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [userBonds, setUserBonds] = useState<Bond[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  // Get all bonds by issuer
  const { data: bondIds, isPending: isLoadingBondIds } = useReadContract({
    contract: bondContract,
    method: "function getBondsByIssuer(address issuer) view returns (uint256[])",
    params: [account?.address ?? ''],
  });

  console.log("Bond IDs:", bondIds);

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

  /* 
  // Commented out: Fetch bond details for each bond ID
  useEffect(() => {
    const fetchBondDetails = async () => {
      if (!bondIds || bondIds.length === 0 || !account) {
        setIsLoading(false);
        return;
      }

      try {
        const bondDetailsPromises = bondIds.map(async (bondId, idx) => {
          try {
            // Use a try-catch block for each individual contract call
            // Be more specific about the return type to avoid the "Unknown type" error
            const { data: details, isPending }= useReadContract({
              contract: bondContract,
              method: "function getActiveBondDetailsByBondId(uint256 bondId) view returns (string, address, uint256, bool, uint256, string, string, uint256, uint256, uint256, uint256, address, uint256, uint256, uint256, uint256, uint256, address)",
              // method: "function getActiveBondDetailsByBondId(uint256 bondId) view returns (string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string)",
              params: [bondId],
            });
            
            console.log(`Bond ${bondId} details:`, details);
            
            // Convert the returned array to the expected format
            const bondDetails = details as unknown as [
              number,              // 0: bondId (uint256)
              string,              // 1: issuer (address)
              number,              // 2: maturityDate (uint256) - using actual position from your data
              boolean,             // 3: isActive (bool)
              number,              // 4: amountInCirculation (uint256)
              string,              // 5: name (string)
              string,              // 6: symbol (string)
              number,              // 7: faceValue (uint256)
              number,              // 8: couponRate (uint256)
              number,              // 9: couponFrequency (uint256)
              number,              // 10: creationTimestamp (uint256) - using actual position from your data
              string,              // 11: stablecoinAddress (address)
              number,              // 12: tokensPerBond (uint256)
              number,              // 13: tokenPrice (uint256)
              number,              // 14: maxBondSupply (uint256)
              number,              // 15: maxFundingAmount (uint256)
              number,              // 16: creationBlock (uint256)
              string               // 17: bondAddress/deployer (address)
            ];
            
            console.log(`Bond ${bondId} details:`, details);
            
            // Parse the tuple returned based on the actual data structure we're receiving
            return {
              bondId: bondDetails[0],
              issuer: bondDetails[1],
              maturityDate: bondDetails[2],
              isActive: bondDetails[3],
              amountInCirculation: bondDetails[4],
              name: bondDetails[5],
              symbol: bondDetails[6],
              faceValue: bondDetails[7],
              couponRate: bondDetails[8],
              couponFrequency: bondDetails[9],
              creationTimestamp: bondDetails[10],
              stablecoinAddress: bondDetails[11],
              tokensPerBond: bondDetails[12],
              tokenPrice: bondDetails[13],
              maxBondSupply: bondDetails[14],
              maxFundingAmount: bondDetails[15],
              creationBlock: bondDetails[16],
              bondAddress: bondDetails[17],
              // Calculate derived fields
              maturityDateStr: new Date(bondDetails[2] * 1000).toLocaleDateString(),
              daysUntilMaturity: getDaysUntilMaturity(new Date(bondDetails[2] * 1000).toISOString())
            };
          } catch (error) {
            console.error(`Error fetching details for bond ID ${bondId}:`, error);
            // Return a placeholder bond with the ID so we at least know which bond failed
            return {
              bondId: Number(bondId),
              issuer: account?.address || "",
              maturityDate: 0,
              isActive: false,
              amountInCirculation: 0,
              name: "Error Loading Bond",
              symbol: "ERR",
              faceValue: 0,
              couponRate: 0,
              couponFrequency: 0,
              creationTimestamp: 0,
              stablecoinAddress: "",
              tokensPerBond: 0,
              tokenPrice: 0,
              maxBondSupply: 0,
              maxFundingAmount: 0,
              creationBlock: 0,
              bondAddress: "",
              maturityDateStr: "Unknown",
              daysUntilMaturity: 0
            };
          }
        });

        const bondDetails = await Promise.all(bondDetailsPromises);
        // Filter out any bonds that completely failed to load (optional)
        const validBondDetails = bondDetails.filter(bond => bond.bondAddress !== "");
        setUserBonds(validBondDetails.length > 0 ? validBondDetails : bondDetails);
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
  */
  
  // Set loading to false after bondIds are fetched
  useEffect(() => {
    if (!isLoadingBondIds) {
      setIsLoading(false);
    }
  }, [isLoadingBondIds]);

  const handleCreateSuccess = (newBond: any) => {
    // This function would be called after successfully creating a bond
    setIsOpen(false);
    // In a real implementation, you'd refresh the bond data
  };

  // Format address for display
  const formatAddress = (address: string): string => {
    if (!address) return "Unknown";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle redeem button click
  const handleRedeemClick = (bondId: number) => {
    // Set processing state for this specific bond
    setIsProcessing(prev => ({ ...prev, [`redeem-${bondId}`]: true }));
    
    // Simulate processing with a timeout
    setTimeout(() => {
      // Show success toast
      toast({
        title: "Success!",
        description: `Bond #${bondId} has been redeemed successfully.`,
        duration: 5000,
      });
      
      // Reset processing state
      setIsProcessing(prev => ({ ...prev, [`redeem-${bondId}`]: false }));
    }, 1500);
  };

  // Handle coupon button click
  const handleCouponClick = (bondId: number) => {
    // Set processing state for this specific bond
    setIsProcessing(prev => ({ ...prev, [`coupon-${bondId}`]: true }));
    
    // Simulate processing with a timeout
    setTimeout(() => {
      // Show success toast
      toast({
        title: "Success!",
        description: `Interest payment for Bond #${bondId} has been successfully sent.`,
        duration: 5000,
      });
      
      // Reset processing state
      setIsProcessing(prev => ({ ...prev, [`coupon-${bondId}`]: false }));
    }, 1500);
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
      <p className="text-gray-500 mb-4">
        {bondIds && bondIds.length > 0 ? ` | Total Bonds: ${bondIds.length} |` : ""} 
        {account && bondIds && bondIds.length > 0 ? ` | Issuer: ${formatAddress(account.address)} |` : ""}
        {account && bondIds && bondIds.length > 0 ? ` | Bond IDs: ${bondIds.join(", ")} |` : ""}
      </p>

      {isLoading || isLoadingBondIds ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-blue-500">Loading your bonds...</span>
        </div>
      ) : bondIds && bondIds.length > 0 ? (
        <div className="space-y-3">
          {bondIds.map((bondId) => (
            <Card key={bondId} className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      Bond ID: {bondId}
                    </CardTitle>
                    <CardDescription>Issuer: {formatAddress(account?.address || "")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="bg-gray-50 border-t flex justify-between items-center p-3">
                <div>
                  <p className="text-xs text-gray-500">Created by: {formatAddress(account?.address || "")}</p>
                </div>
                {/* <Button variant="outline" className="flex items-center gap-1 text-blue-600">
                  Manage Bond <ChevronRight className="h-4 w-4" />
                </Button> */}

                <Button 
                  variant="outline" 
                  className="flex gap-2 items-center bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 hover:bg-blue-200 hover:border-blue-400 transition-colors duration-200 text-blue-700 font-medium px-4 py-2 rounded-md shadow-sm"
                  onClick={() => handleRedeemClick(bondId)}
                  disabled={isProcessing[`redeem-${bondId}`]}
                >
                  {isProcessing[`redeem-${bondId}`] ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Redeem Bond</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  className="flex gap-2 items-center bg-gradient-to-r from-green-50 to-green-100 border-green-300 hover:bg-green-200 hover:border-green-400 transition-colors duration-200 text-green-700 font-medium px-4 py-2 rounded-md shadow-sm"
                  onClick={() => handleCouponClick(bondId)}
                  disabled={isProcessing[`coupon-${bondId}`]}
                >
                  {isProcessing[`coupon-${bondId}`] ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-green-700" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay Interest</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
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