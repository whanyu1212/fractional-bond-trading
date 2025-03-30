"use client";

import { useState, useEffect } from "react";
import { useReadContract } from "thirdweb/react";
import { bondContract } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Calendar, DollarSign, User, LinkIcon, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";



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

// Assuming bondContract is defined elsewhere
// import { bondContract } from './contracts';

export function BondCard() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [filteredBonds, setFilteredBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchIndex, setSearchIndex] = useState("");
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Create contract reads for the first 3 bonds
  const bondRequests = Array.from({ length: 4 }, (_, i) => {
    return useReadContract({
      contract: bondContract,
      method: "function getActiveBondDetailsByIndex(uint256 index) view returns (address bondAddress, string name, string symbol, uint256 bondId, uint256 faceValue, uint256 couponRate, uint256 couponFrequency, uint256 maturityDate, address issuer, address stablecoinAddress, uint256 tokensPerBond, uint256 tokenPrice, uint256 maxBondSupply, uint256 creationTimestamp)",
      params: [BigInt(i)],
    });
  });

  // Process the bond data when it's available
  useEffect(() => {
    // Check if all requests are complete
    const isPendingStates = bondRequests.map(req => req.isPending);
    const allLoaded = !isPendingStates.some(isPending => isPending);
    
    if (allLoaded) {
      const bondsList = bondRequests
        .map((req, i) => {
          if (req.data) {
            return {
              index: i,
              bondAddress: req.data[0],
              name: req.data[1],
              symbol: req.data[2],
              bondId: req.data[3].toString(),
              faceValue: Number(req.data[4])/1e6, // Assuming 18 decimals
              couponRate: Number(req.data[5]) / 100, // Convert basis points to percentage
              couponFrequency: Number(req.data[6]),
              maturityDate: new Date(Number(req.data[7]) * 1000).toLocaleDateString(),
              issuer: req.data[8],
              stablecoinAddress: req.data[9],
              tokensPerBond: Number(req.data[10]),
              tokenPrice: Number(req.data[11]) / 1e6,
              maxBondSupply: Number(req.data[12])/1e6,
              creationTimestamp: Number(req.data[13])
            };
          }
          return null;
        })
        .filter((bond): bond is Bond => bond !== null);
      
      setBonds(bondsList);
      setFilteredBonds(bondsList);
      setLoading(false);
    }
  }, [bondRequests.map(req => req.isPending).join()]); // Fixed dependency array

  // Handle search by index
  const handleSearch = () => {
    console.log("Searching for index:", searchIndex);
    if (searchIndex === "") {
      setFilteredBonds(bonds);
      return;
    }
    
    const index = parseInt(searchIndex);
    if (isNaN(index)) {
      setFilteredBonds([]);
      return;
    }
    
    const foundBond = bonds.find(bond => bond.index === index);
    console.log("Found bond:", foundBond);
    setFilteredBonds(foundBond ? [foundBond] : []);
  };

  // Reset search
  const resetSearch = () => {
    setSearchIndex("");
    setFilteredBonds(bonds);
  };

  // View bond details
  const viewBondDetails = (bond: Bond) => {
    setSelectedBond(bond);
    setDetailsOpen(true);
  };

  // Individual Bond Card Component
  const BondItem = ({ bond }: { bond: Bond }) => (
    <Card className="w-full mb-4">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{bond.name}</CardTitle>
          <Badge variant="outline">{bond.symbol}</Badge>
        </div>
        <CardDescription>Bond #{bond.index}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Issuer</div>
          <div className="font-medium truncate">{formatAddress(bond.issuer)}</div>
          
          <div className="text-muted-foreground">Maturity Date</div>
          <div className="font-medium">{bond.maturityDate}</div>
          
          <div className="text-muted-foreground">Face Value</div>
          <div className="font-medium">{bond.faceValue} USDC</div>
          
          <div className="text-muted-foreground">Coupon Rate</div>
          <div className="font-medium">{bond.couponRate}%</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant="outline" onClick={() => viewBondDetails(bond)}>
          View Details
        </Button>
      </CardFooter>
    </Card>
  );

  // Add Enter key support for search
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Format blockchain address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1">
          <Input 
            type="text" 
            placeholder="Search by bond index..." 
            value={searchIndex}
            onChange={(e) => setSearchIndex(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10"
          />
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
        </div>
        <Button onClick={handleSearch}>Search</Button>
        {searchIndex && (
          <Button variant="outline" onClick={resetSearch}>Reset</Button>
        )}
      </div>

      {loading ? (
        <div className="w-full flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredBonds.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBonds.map((bond) => (
            <BondItem key={bond.index} bond={bond} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No bonds found matching your search.</p>
        </div>
      )}

      {/* Bond Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedBond?.name} ({selectedBond?.symbol})</span>
              <Badge variant="outline">Bond #{selectedBond?.index}</Badge>
            </DialogTitle>
            <DialogDescription>
              Detailed information about this bond
            </DialogDescription>
          </DialogHeader>
          
          {selectedBond && (
            <div className="space-y-4 py-2">
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Issuer</p>
                  <div className="flex items-center space-x-1">
                    <p className="text-sm text-muted-foreground break-all">{selectedBond.issuer}</p>
                    <button 
                      className="text-primary hover:text-primary/80"
                      onClick={() => navigator.clipboard.writeText(selectedBond.issuer)}
                      title="Copy to clipboard"
                    >
                      <LinkIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <LinkIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Bond Address</p>
                  <div className="flex items-center space-x-1">
                    <p className="text-sm text-muted-foreground break-all">{selectedBond.bondAddress}</p>
                    <button 
                      className="text-primary hover:text-primary/80"
                      onClick={() => navigator.clipboard.writeText(selectedBond.bondAddress)}
                      title="Copy to clipboard"
                    >
                      <LinkIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Maturity Date</p>
                  <p className="text-sm text-muted-foreground">{selectedBond.maturityDate}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Face Value</p>
                  <p className="text-sm text-muted-foreground">{selectedBond.faceValue} USDC</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Coupon Rate</p>
                  <p className="text-sm text-muted-foreground">{selectedBond.couponRate}%</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Coupon Frequency</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBond.couponFrequency === 1 ? 'Annual' : 
                    selectedBond.couponFrequency === 2 ? 'Semi-annual' : 
                    selectedBond.couponFrequency === 4 ? 'Quarterly' : 
                    selectedBond.couponFrequency === 12 ? 'Monthly' : 
                    `${selectedBond.couponFrequency} times per year`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Token Details</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBond.tokensPerBond} tokens per bond at {selectedBond.tokenPrice} USDC each
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Maximum Supply</p>
                  <p className="text-sm text-muted-foreground">{selectedBond.maxBondSupply} bonds</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button variant="outline" asChild>
              <a 
                href={`https://sepolia.etherscan.io/address/${selectedBond?.bondAddress}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                View on Etherscan
              </a>
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}