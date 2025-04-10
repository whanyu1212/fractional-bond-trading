"use client";

import { useState, useEffect } from "react";
import { bondMarketPlaceContract } from "@/constants/contract";
import { useReadContract } from "thirdweb/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
    const allLoaded = !isPendingStates.some((p) => p);

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
  }, [bondRequests.map((r) => r.isPending).join()]);

  const handleSearch = () => {
    if (searchIndex === "") return setFilteredBonds(bonds);
    const index = parseInt(searchIndex);
    if (isNaN(index)) return setFilteredBonds([]);
    const found = bonds.find((b) => b.index === index);
    setFilteredBonds(found ? [found] : []);
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
    if (e.key === "Enter") handleSearch();
  };

  const formatAddress = (address: string) =>
    `${address.slice(0, 6)}...${address.slice(-4)}`;

  const BondItem = ({ bond }: { bond: Bond }) => (
    <Card className="w-full rounded-2xl bg-white/80 backdrop-blur-md border border-white/30 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all duration-200">
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
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div>Issuer</div>
          <div className="font-medium text-gray-800 truncate">
            {formatAddress(bond.issuer)}
          </div>
          <div>Price</div>
          <div className="font-medium text-gray-800">{bond.price} USDC</div>
          <div>Total Holders</div>
          <div className="font-medium text-gray-800">{bond.totalHolders}</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => viewBondDetails(bond)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      {/* Search */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search by bond index..."
            value={searchIndex}
            onChange={(e) => setSearchIndex(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 py-3 rounded-full bg-gray-100 border border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
          />
          <Search className="h-4 w-4 absolute left-3 top-3 text-gray-500" />
        </div>
        <Button className="h-10 bg-indigo-600 text-white hover:bg-indigo-700" onClick={handleSearch}>
          Search
        </Button>
        {searchIndex && (
          <Button variant="outline" className="h-10" onClick={resetSearch}>
            Reset
          </Button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="w-full flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      ) : filteredBonds.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBonds.map((bond) => (
            <BondItem key={bond.index} bond={bond} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          No bonds found matching your search.
        </div>
      )}

      {/* Bond Detail Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md bg-white/90 backdrop-blur-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Bond Details</span>
              <Badge variant={selectedBond?.isMatured ? "destructive" : "outline"}>
                {selectedBond?.isMatured ? "Matured" : "Active"}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Information about Bond #{selectedBond?.index}
            </DialogDescription>
          </DialogHeader>

          {selectedBond && (
            <div className="space-y-4 py-2">
              <DetailRow icon={<User />} label="Issuer" value={selectedBond.issuer} copy />
              <DetailRow icon={<Calendar />} label="Listing Date" value={selectedBond.listingTime} />
              <DetailRow icon={<DollarSign />} label="Price" value={`${selectedBond.price} USDC`} />
              <DetailRow icon={<User />} label="Total Holders" value={`${selectedBond.totalHolders}`} />
              <DetailRow icon={<Calendar />} label="Status" value={selectedBond.isMatured ? "Matured" : "Active"} />
            </div>
          )}

          <DialogFooter className="flex justify-between items-center mt-4">
            <Button variant="outline" asChild>
              <a
                href={`https://sepolia.etherscan.io/address/${selectedBond?.issuer}`}
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
    <div className="flex items-start space-x-3 text-sm text-gray-700">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div className="space-y-0.5">
        <p className="font-medium text-sm">{label}</p>
        <div className="flex items-center gap-1 break-all">
          <span>{value}</span>
          {copy && (
            <button
              className="text-indigo-600 hover:text-indigo-800"
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
