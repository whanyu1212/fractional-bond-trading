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
    method: "function getActiveBondCount() view returns (uint256)",
    params: [],
  });

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    bondName: "",
    bondSymbol: "",
    faceValue: "",
    couponRate: "",
    couponFrequency: "2", // Default to semi-annual
    customCouponFrequency: "",
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

    // Create a form copy for validation, handling the coupon frequency special case
    const formForValidation = {...form};
    if (form.couponFrequency === 'custom') {
      formForValidation.couponFrequency = form.customCouponFrequency;
    }
    delete (formForValidation as any).customCouponFrequency;

    const requiredFields = Object.entries(formForValidation).filter(([key, value]) => value.trim() === "");
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
      
      // Use custom frequency if selected, otherwise use the selected value
      const couponFrequency = form.couponFrequency === 'custom' 
        ? BigInt(form.customCouponFrequency) 
        : BigInt(form.couponFrequency);

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
          couponFrequency,
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
        couponFrequency: "2",
        customCouponFrequency: "",
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
    <div className=" p-6 max-w-md mx-auto">
  
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Bond Name</label>
          <Input
            type="text"
            placeholder="e.g., Treasury Bond Series A"
            value={form.bondName}
            onChange={(e) => handleChange("bondName", e.target.value)}
            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Bond Symbol</label>
          <Input
            type="text"
            placeholder="e.g., TBOND1"
            value={form.bondSymbol}
            onChange={(e) => handleChange("bondSymbol", e.target.value)}
            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Face Value (USDC)</label>
          <Input
            type="number"
            placeholder="Enter face value"
            value={form.faceValue}
            onChange={(e) => handleChange("faceValue", e.target.value)}
            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Coupon Rate (%)</label>
          <div className="relative">
            <Input
              type="number"
              placeholder="e.g.,  500 for 5%"
              value={form.couponRate}
              onChange={(e) => handleChange("couponRate", e.target.value)}
              className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Coupon Frequency</label>
          <select
            value={form.couponFrequency}
            onChange={(e) => handleChange("couponFrequency", e.target.value)}
            className="w-full h-10 px-3 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="1">Annual</option>
            <option value="2">Semi-annual</option>
            <option value="4">Quarterly</option>
            <option value="12">Monthly</option>
            <option value="custom">Other(Year)</option>
          </select>
        </div>

        {form.couponFrequency === 'custom' && (
          <div className="space-y-2">
            <label className="block text-sm font-bold text-blue-700">Custom Frequency</label>
            <Input
              type="number"
              placeholder="Enter custom frequency"
              value={form.customCouponFrequency}
              onChange={(e) => handleChange("customCouponFrequency", e.target.value)}
              className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Tokens per Bond</label>
          <Input
            type="number"
            placeholder="Enter tokens per bond"
            value={form.tokensPerBond}
            onChange={(e) => handleChange("tokensPerBond", e.target.value)}
            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Bond Price (USDC)</label>
          <Input
            type="number"
            placeholder="Enter bond price"
            value={form.bondPrice}
            onChange={(e) => handleChange("bondPrice", e.target.value)}
            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Max Bond Supply</label>
          <Input
            type="number"
            placeholder="Enter max supply"
            value={form.maxBondSupply}
            onChange={(e) => handleChange("maxBondSupply", e.target.value)}
            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-blue-700">Maturity Date</label>
          <Input
            type="date"
            value={form.maturityDate}
            onChange={(e) => handleChange("maturityDate", e.target.value)}
            className="border-blue-200 focus:border-blue-500 focus:ring-blue-500 rounded-md"
          />
        </div>
      </div>

      <div className="mt-6">
        <Button 
          onClick={handleCreate} 
          disabled={loading} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin w-4 h-4" /> Creating...
            </span>
          ) : (
            "Create Bond"
          )}
        </Button>
      </div>
      
      {isPending && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700 flex items-center">
            <Loader2 className="animate-spin w-4 h-4 mr-2" />
            Transaction is pending... Please wait for confirmation.
          </p>
        </div>
      )}
    </div>
  );
}