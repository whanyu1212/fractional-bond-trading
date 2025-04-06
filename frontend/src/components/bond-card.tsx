"use client";

import { useState, useEffect } from "react";
import { bondMarketPlaceContract } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Calendar, DollarSign, User, LinkIcon, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useReadContract } from "thirdweb/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// Define Bond type to match the actual contract return values
interface Bond {
  index: number;
  issuer: string;
  price: number;
  listingTime: string;
  isMatured: boolean;
  totalHolders: number;
}

export function BondCard() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [filteredBonds, setFilteredBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchIndex, setSearchIndex] = useState("");
  const [selectedBond, setSelectedBond] = useState<Bond | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // const { data: bondCount, isPending } = useReadContract({
  //   contract: bondMarketPlaceContract,
  //   method: "function totalListedBonds() view returns (uint256)",
  //   params: [],
  // });


  // Create contract reads for the first 4 bonds
  const bondRequests = Array.from({ length: 10 }, (_, i) => {
    return useReadContract({
      contract: bondMarketPlaceContract,
      method: "function getBondInfo(uint256 index) view returns (address issuer, uint256 price, uint256 listingTime, bool isMatured, uint256 totalHolders)",
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
              issuer: req.data[0], // address issuer
              price: Number(req.data[1]) / 1e6, // uint256 price (converted from wei to USDC)
              listingTime: new Date(Number(req.data[2]) * 1000).toLocaleDateString(), // uint256 listingTime
              isMatured: req.data[3], // bool isMatured
              totalHolders: Number(req.data[4]) // uint256 totalHolders
            };
          }
          return null;
        })
        .filter((bond): bond is Bond => bond !== null);
      
      setBonds(bondsList);
      setFilteredBonds(bondsList);
      setLoading(false);
    }
  }, [bondRequests.map(req => req.isPending).join()]);

  // Handle search by index
  const handleSearch = () => {
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
          <CardTitle>Bond #{bond.index}</CardTitle>
          <Badge variant={bond.isMatured ? "destructive" : "outline"}>
            {bond.isMatured ? "Matured" : "Active"}
          </Badge>
        </div>
        <CardDescription>Listed on {bond.listingTime}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Issuer</div>
          <div className="font-medium truncate">{formatAddress(bond.issuer)}</div>
          
          <div className="text-muted-foreground">Price</div>
          <div className="font-medium">{bond.price} USDC</div>
          
          <div className="text-muted-foreground">Total Holders</div>
          <div className="font-medium">{bond.totalHolders}</div>
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
              <span>Bond Details</span>
              <Badge variant={selectedBond?.isMatured ? "destructive" : "outline"}>
                {selectedBond?.isMatured ? "Matured" : "Active"}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Detailed information about Bond #{selectedBond?.index}
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
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Listing Date</p>
                  <p className="text-sm text-muted-foreground">{selectedBond.listingTime}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Price</p>
                  <p className="text-sm text-muted-foreground">{selectedBond.price} USDC</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Total Holders</p>
                  <p className="text-sm text-muted-foreground">{selectedBond.totalHolders}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-sm">Status</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedBond.isMatured ? 'Matured' : 'Active'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <Button variant="outline" asChild>
              <a 
                href={`https://sepolia.etherscan.io/address/${selectedBond?.issuer}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1"
              >
                <ExternalLink className="h-4 w-4" />
                View Issuer on Etherscan
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