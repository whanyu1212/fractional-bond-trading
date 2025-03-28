"use client";

import React, { useState } from "react";
import { ethers } from "ethers";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bondMarketplace, tbond } from "@/constants/contract";
import { prepareContractCall, readContract, toWei } from "thirdweb";


const CreateBond: React.FC = () => {
  const { toast } = useToast();
  const [bondName, setBondName] = useState<string>("");
  const [bondSymbol, setBondSymbol] = useState<string>("");
  const [faceValue, setFaceValue] = useState<string>("");
  const [couponRate, setCouponRate] = useState<string>("");
  const [maturityDate, setMaturityDate] = useState<string>("");
  const [bondPrice, setBondPrice] = useState<string>("");
  const [isCreating, setIsCreating] = useState<boolean>(false);




  const handleCreateBond = async () => {
    if (!bondName || !bondSymbol || !faceValue || !couponRate || !maturityDate || !bondPrice) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (!tbond || !bondMarketplace) {
      toast({ title: "Error", description: "Contract not loaded properly", variant: "destructive" });
      return;
    }

    try {
      setIsCreating(true);

      // 计算到期时间（Unix Timestamp）
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const duration = Math.floor(new Date(maturityDate).getTime() / 1000) - currentTimestamp;

      if (duration <= 0) {
        toast({ title: "Invalid Date", description: "Maturity date must be in the future", variant: "destructive" });
        setIsCreating(false);
        return;
      }

      // 票息转换为 basis points (bps)
      const formattedCouponRate = BigInt(Number(couponRate) * 100); // 5% -> 500 bps

      // 票面价值和债券价格（假设是 USDC, 6 位小数）
      const formattedFaceValue = ethers.parseUnits(faceValue, 6);
      const formattedBondPrice = ethers.parseUnits(bondPrice, 6);


      function callDeploy(){
        const tx = await prepareContractCall({
            contract: tbond,
            method:
              "function createMarket(string _question, string _optionA, string _optionB, uint256 _duration) returns (uint256)",
            params: [question, optionA, optionB, BigInt(duration)],
          });
        //   await mutateTransaction(tx);

      }
      
      // ✅ 调用 `Tokenizedtbond` 创建债券
      const tx = await tbond.call("createBond", [
        bondName,
        bondSymbol,
        formattedFaceValue,
        formattedCouponRate,
        BigInt(duration),
        formattedBondPrice,
      ]);

      toast({ title: "Bond Created", description: "Your bond has been successfully created!", duration: 5000 });

      // ✅ 获取 `tokenId`（假设返回值是 tokenId）
      const tokenId = tx.receipt.events?.find((e: any) => e.event === "BondCreated")?.args?.tokenId;

      if (!tokenId) {
        toast({ title: "Error", description: "Failed to retrieve Bond ID", variant: "destructive" });
        setIsCreating(false);
        return;
      }

      // ✅ 立即将债券上架市场
      await bondMarketplace.call("listBond", [tokenId, TOKENIZED_BOND_FACTORY_ADDRESS, formattedBondPrice]);

      toast({ title: "Bond Listed", description: "Your bond is now available on the marketplace!", duration: 5000 });

      // 清空输入框
      setBondName("");
      setBondSymbol("");
      setFaceValue("");
      setCouponRate("");
      setMaturityDate("");
      setBondPrice("");
    } catch (error) {
      console.error(error);
      toast({ title: "Create Bond Error", description: "There was an error creating the bond", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg w-full max-w-lg">
      <h2 className="text-2xl font-bold mb-4">Create a New Bond</h2>

      <div className="space-y-4">
        <div>
          <Label>Bond Name</Label>
          <Input type="text" value={bondName} onChange={(e) => setBondName(e.target.value)} placeholder="Enter bond name" />
        </div>

        <div>
          <Label>Bond Symbol</Label>
          <Input type="text" value={bondSymbol} onChange={(e) => setBondSymbol(e.target.value)} placeholder="Enter bond symbol (e.g., TBOND)" />
        </div>

        <div>
          <Label>Face Value (USDC)</Label>
          <Input type="number" value={faceValue} onChange={(e) => setFaceValue(e.target.value)} placeholder="Enter face value (e.g., 1000)" />
        </div>

        <div>
          <Label>Coupon Rate (%)</Label>
          <Input type="number" value={couponRate} onChange={(e) => setCouponRate(e.target.value)} placeholder="Enter coupon rate (e.g., 5 for 5%)" />
        </div>

        <div>
          <Label>Maturity Date</Label>
          <Input type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)} />
        </div>

        <div>
          <Label>Bond Price (USDC)</Label>
          <Input type="number" value={bondPrice} onChange={(e) => setBondPrice(e.target.value)} placeholder="Enter bond price (e.g., 950)" />
        </div>

        <Button onClick={handleCreateBond} disabled={isCreating} className="w-full mt-4">
          {isCreating ? "Creating Bond..." : "Create Bond"}
        </Button>
      </div>
    </div>
  );
};

export default CreateBond;
