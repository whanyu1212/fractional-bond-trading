"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BondForm } from "@/components/bond-form";
import { Loader2, PlusCircle, ChevronRight } from "lucide-react";

export function UserBonds() {
  const account = useActiveAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [userBonds, setUserBonds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Example user bond data with multiple bonds in blue color theme
  const mockUserBonds = [
    {
      id: 3,
      name: "Treasury Bond Series A",
      symbol: "UBOND1",
      faceValue: "1500",
      couponRate: "600", // 6%
      maturityDate: "2027-03-15",
      price: "1450",
      issuer: account ? account.address : "0xabcd...ef12",
      supply: "200",
      remaining: "180",
      createdAt: "2025-03-25"
    },
    {
      id: 4,
      name: "Corporate Bond XYZ",
      symbol: "UBOND2",
      faceValue: "2000",
      couponRate: "750", // 7.5%
      maturityDate: "2026-11-20",
      price: "1950",
      issuer: account ? account.address : "0xabcd...ef12",
      supply: "100",
      remaining: "75",
      createdAt: "2025-03-10"
    },
    {
      id: 5,
      name: "Municipal Bond ABC",
      symbol: "UBOND3",
      faceValue: "1000",
      couponRate: "400", // 4%
      maturityDate: "2028-05-10",
      price: "980",
      issuer: account ? account.address : "0xabcd...ef12",
      supply: "300",
      remaining: "285",
      createdAt: "2025-03-15"
    }
  ];

  const handleCreateSuccess = (newBond: any) => {
    // This function would be called after successfully creating a bond
    setIsOpen(false);
    // In a real implementation, you'd update the userBonds state with the new bond data
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

      {mockUserBonds.length > 0 ? (
        <div className="space-y-3">
          {mockUserBonds.map((bond) => (
            <Card 
              key={bond.id} 
              className="overflow-hidden border-l-4 border-l-blue-500 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/4 bg-blue-50 p-4">
                  <div className="flex flex-col h-full justify-center">
                    <h3 className="font-bold text-blue-800">{bond.name}</h3>
                    <p className="text-sm text-blue-600 mt-1">Symbol: {bond.symbol}</p>
                    <Badge className="mt-2 w-fit bg-blue-100 text-blue-800 hover:bg-blue-200">
                      {(parseInt(bond.couponRate) / 100).toFixed(2)}% Coupon
                    </Badge>
                  </div>
                </div>
                
                <div className="md:w-1/2 p-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    <div className="text-sm">
                      <span className="text-gray-500">Face Value:</span>
                      <span className="ml-2 font-medium">{bond.faceValue} USDC</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Price:</span>
                      <span className="ml-2 font-medium">{bond.price} USDC</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Maturity:</span>
                      <span className="ml-2 font-medium">{new Date(bond.maturityDate).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 font-medium">{new Date(bond.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Supply:</span>
                      <span className="ml-2 font-medium">{bond.supply} Bonds</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-500">Sold:</span>
                      <span className="ml-2 font-medium">{(parseInt(bond.supply) - parseInt(bond.remaining))} / {bond.supply}</span>
                    </div>
                  </div>
                </div>
                
                <div className="md:w-1/4  p-2 flex items-center justify-center border-l border-blue-100">
                  <div className="flex flex-row md:flex-col gap-2 w-full">
                    <Button 
                      variant="outline" 
                      className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                    >
                      Edit Bond
                    </Button>
                    {/* <Button 
                      variant="destructive" 
                      size="sm"
                      className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800"
                    >
                      Remove
                    </Button> */}
                  </div>
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