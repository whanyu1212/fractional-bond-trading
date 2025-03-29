"use client";

import { useState } from "react";
import { prepareContractCall } from "thirdweb";
import {
  useSendAndConfirmTransaction,
  useActiveAccount,
  useSendTransaction,
  useReadContract,
} from "thirdweb/react";
import { bondContract, mockStableCoinAddress } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function BondForm({ onSuccess }: { onSuccess: (newBond: any) => void }) {
  const { toast } = useToast();
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();

  const { data: bondCount, isPending } = useReadContract({
    contract: bondContract,
    method:
      "function getActiveBondCount() view returns (uint256)",
    params: [],
  });

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    bondName: "",
    bondSymbol: "",
    faceValue: "",
    couponRate: "",
    couponFrequency: "",
    tokensPerBond: "",
    bondPrice: "",
    maxBondSupply: "",
    maturityDate: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!account) {
      toast({ title: "Please connect your wallet first", variant: "destructive" });
      return;
    }

    const requiredFields = Object.entries(form).filter(([key, value]) => value.trim() === "");
    if (requiredFields.length > 0) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (bondCount === undefined) {
      toast({ title: "Unable to fetch bond count", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);

      const bondId = BigInt(bondCount);
      const maturityTimestamp = BigInt(new Date(form.maturityDate).getTime() / 1000); // seconds

      const tx = prepareContractCall({
        contract: bondContract,
        method:
          "function createTokenizedBond(string _name, string _symbol, uint256 _id, uint256 _faceValue, uint256 _couponRate, uint256 _couponFrequency, uint256 _maturityDate, address _issuer, address _stablecoinAddress, uint256 _tokensPerBond, uint256 _bondPrice, uint256 _maxBondSupply) returns (address)",
        params: [
          form.bondName,
          form.bondSymbol,
          bondId,
          BigInt(form.faceValue),
          BigInt(form.couponRate),
          BigInt(form.couponFrequency),
          maturityTimestamp,
          account.address,
          mockStableCoinAddress,
          BigInt(form.tokensPerBond),
          BigInt(form.bondPrice),
          BigInt(form.maxBondSupply),
        ],
      });

      await sendTransaction(tx);

      toast({ 
        title: "✅ Bond created successfully", 
        description: "Your bond has been created and added to the marketplace.", 
      });
      
      // Create a new bond object to pass to the parent component
      const newBond = {
        id: bondCount.toString(),
        name: form.bondName,
        symbol: form.bondSymbol,
        faceValue: form.faceValue,
        couponRate: form.couponRate,
        maturityDate: form.maturityDate,
        price: form.bondPrice,
        issuer: account.address,
        supply: form.maxBondSupply,
        remaining: form.maxBondSupply,
        createdAt: new Date().toISOString().split('T')[0]
      };

      // Notify the parent component about the successful creation
      if (onSuccess) {
        onSuccess(newBond);
      }

      // Reset the form
      setForm({
        bondName: "",
        bondSymbol: "",
        faceValue: "",
        couponRate: "",
        couponFrequency: "",
        tokensPerBond: "",
        bondPrice: "",
        maxBondSupply: "",
        maturityDate: "",
      });
      
    } catch (err: any) {
      console.error("Creation failed", err);
      toast({
        title: "Creation Failed",
        description: err?.message || "Unknown error, check the console.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div>
        <label className="block text-sm mb-1">Bond Name</label>
        <Input
          type="text"
          placeholder="e.g., Treasury Bond Series A"
          value={form.bondName}
          onChange={(e) => handleChange("bondName", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Bond Symbol</label>
        <Input
          type="text"
          placeholder="e.g., TBOND1"
          value={form.bondSymbol}
          onChange={(e) => handleChange("bondSymbol", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Face Value (USDC)</label>
        <Input
          type="number"
          placeholder="Enter face value"
          value={form.faceValue}
          onChange={(e) => handleChange("faceValue", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Coupon Rate (e.g. 5% = 500)</label>
        <Input
          type="number"
          placeholder="Enter coupon rate"
          value={form.couponRate}
          onChange={(e) => handleChange("couponRate", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Coupon Frequency (e.g. 2 = semi-annual)</label>
        <Input
          type="number"
          placeholder="Enter coupon frequency"
          value={form.couponFrequency}
          onChange={(e) => handleChange("couponFrequency", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Tokens per Bond</label>
        <Input
          type="number"
          placeholder="Enter tokens per bond"
          value={form.tokensPerBond}
          onChange={(e) => handleChange("tokensPerBond", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Bond Price (USDC)</label>
        <Input
          type="number"
          placeholder="Enter bond price"
          value={form.bondPrice}
          onChange={(e) => handleChange("bondPrice", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Max Bond Supply</label>
        <Input
          type="number"
          placeholder="Enter max bond supply"
          value={form.maxBondSupply}
          onChange={(e) => handleChange("maxBondSupply", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Maturity Date</label>
        <Input
          type="date"
          value={form.maturityDate}
          onChange={(e) => handleChange("maturityDate", e.target.value)}
        />
      </div>

      <Button onClick={handleCreate} disabled={loading} className="w-full">
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin w-4 h-4" /> Creating...
          </span>
        ) : (
          "Create Bond"
        )}
      </Button>
      {isPending && <p>Transaction is pending... Please wait for confirmation.</p>}
    </div>
  );
}