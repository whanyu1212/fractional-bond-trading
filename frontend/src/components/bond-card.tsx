"use client";

import { useState, useEffect } from "react";
import { bondMarketPlaceContract } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ExternalLink,
  Calendar,
  DollarSign,
  User,
  LinkIcon,
  Loader2,
} from "lucide-react";
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

  const bondRequests = Array.from({ length: 10 }, (_, i) =>
    useReadContract({
      contract: bondMarketPlaceContract,
      method:
        "function getBondInfo(uint256 index) view returns (address issuer, uint256 price, uint256 listingTime, bool isMatured, uint256 totalHolders)",
      params: [BigInt(i)],
    })
  );

  useEffect(() => {
    const isPendingStates = bondRequests.map((req) => req.isPending);
    const allLoaded = !isPendingStates.some((isPending) => isPending);

    if (allLoaded) {
      const bondsList = bondRequests
        .map((req, i) => {
          if (req.data) {
            return {
              index: i,
              issuer: req.data[0],
              price: Number(req.data[1]) / 1e6,
              listingTime: new Date(Number(req.data[2]) * 1000).toLocaleDateString(),
              isMatured: req.data[3],
              totalHolders: Number(req.data[4]),
            };
          }
          return null;
        })
        .filter((bond): bond is Bond => bond !== null);

      setBonds(bondsList);
      setFilteredBonds(bondsList);
      setLoading(false);
    }
  }, [bondRequests.map((req) => req.isPending).join()]);

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

    const foundBond = bonds.find((bond) => bond.index === index);
    setFilteredBonds(foundBond ? [foundBond] : []);
  };

  const resetSearch = () => {
    setSearchIndex("");
    setFilteredBonds(bonds);
  };

  const viewBondDetails = (bond: Bond) => {
    setSelectedBond(bond);
    setDetailsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const BondItem = ({ bond }: { bond: Bond }) => (
    <Card className="w-full mb-4 rounded-2xl shadow-md transition-all hover:shadow-xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Bond #{bond.index}</CardTitle>
          <Badge variant={bond.isMatured ? "destructive" : "outline"}>
            {bond.isMatured ? "Matured" : "Active"}
          </Badge>
        </div>
        <CardDescription className="text-gray-500">
          Listed on {bond.listingTime}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
          <div>Issuer</div>
          <div className="font-semibold text-gray-800 truncate">
            {formatAddress(bond.issuer)}
          </div>
          <div>Price</div>
          <div className="font-semibold text-gray-800">{bond.price} USDC</div>
          <div>Total Holders</div>
          <div className="font-semibold text-gray-800">{bond.totalHolders}</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" variant="outline" onClick={() => viewBondDetails(bond)}>
          View Details
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search by bond index..."
            value={searchIndex}
            onChange={(e) => setSearchIndex(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 rounded-lg bg-gray-100 border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
        </div>
        <Button className="h-10 bg-blue-600 text-white hover:bg-blue-700" onClick={handleSearch}>
          Search
        </Button>
        {searchIndex && (
          <Button variant="outline" className="h-10" onClick={resetSearch}>
            Reset
          </Button>
        )}
      </div>

      {loading ? (
        <div className="w-full flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredBonds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBonds.map((bond) => (
            <BondItem key={bond.index} bond={bond} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No bonds found matching your search.</p>
        </div>
      )}

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
              <DetailRow icon={<User />} label="Issuer" value={selectedBond.issuer} copy />
              <DetailRow icon={<Calendar />} label="Listing Date" value={selectedBond.listingTime} />
              <DetailRow icon={<DollarSign />} label="Price" value={`${selectedBond.price} USDC`} />
              <DetailRow icon={<User />} label="Total Holders" value={String(selectedBond.totalHolders)} />
              <DetailRow icon={<Calendar />} label="Status" value={selectedBond.isMatured ? "Matured" : "Active"} />
            </div>
          )}

          <DialogFooter className="flex justify-between items-center">
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

function DetailRow({
  icon,
  label,
  value,
  copy = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  copy?: boolean;
}) {
  return (
    <div className="flex items-start space-x-3">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div className="space-y-1">
        <p className="font-medium text-sm">{label}</p>
        <div className="flex items-center space-x-1 break-all text-sm text-gray-700">
          <span>{value}</span>
          {copy && (
            <button
              className="text-blue-600 hover:text-blue-800"
              onClick={() => navigator.clipboard.writeText(value)}
              title="Copy to clipboard"
            >
              <LinkIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
