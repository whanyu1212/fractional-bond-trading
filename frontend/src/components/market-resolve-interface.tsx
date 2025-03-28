import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { prepareContractCall } from "thirdweb";
import { useSendAndConfirmTransaction } from "thirdweb/react";
import { oracleContract } from "@/constants/contract";
import { HermesClient } from "@pythnetwork/hermes-client";
import { getPriceFeedId } from "@/pricefeed/priceFeedIds";

interface MarketResolveInterfaceProps {
  marketId: number;
  endTime: bigint;
  assetSymbol: string;
  operator: number;
  targetPrice: bigint;
}

export function MarketResolveInterface({
  marketId,
  endTime,
  assetSymbol,
  operator,
  targetPrice,
}: MarketResolveInterfaceProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const { mutateAsync: mutateTransaction } = useSendAndConfirmTransaction();

  const resolveMarket = async () => {
    setIsConfirming(true);
    const connection = new HermesClient("https://hermes.pyth.network", {});
    const priceFeedId = getPriceFeedId(assetSymbol);
    const price = await connection.getLatestPriceUpdates([priceFeedId]);
    const priceValue = price ? BigInt(price.parsed[0].price.price) : BigInt(0);
    let outcome = 0;
    // console.log(priceValue, targetPrice, operator);
    switch (operator) {
      case 0:
        if (priceValue > targetPrice) {
          outcome = 1;
        } else {
          outcome = 2;
        }
        break;
      case 1:
        if (priceValue < targetPrice) {
          outcome = 1;
        } else {
          outcome = 2;
        }
        break;
      case 2:
        if (priceValue == targetPrice) {
          outcome = 1;
        } else {
          outcome = 2;
        }
        break;
      default:
        break;
    }

    try {
      const tx = await prepareContractCall({
        contract: oracleContract,
        method: "function resolveMarket(uint256 marketId, uint8 outcome)",
        params: [BigInt(marketId), outcome],
      });
      await mutateTransaction(tx);
      toast({
        title: "Market Resolved",
        description: "The market has been resolved",
        duration: 5000, // 5 seconds
      });
    } catch (error) {
      console.error(error);
      // Optionally show error toast
      toast({
        title: "Resolve Market Error",
        description: "There was an error resolving the market",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  useEffect(() => {
    const resolveTime = new Date(Number(endTime) * 1000);
    // resolve in 24 hours
    //   resolveTime.setHours(resolveTime.getHours() + 24);
    //   resolve in 1 minute
    resolveTime.setMinutes(resolveTime.getMinutes() + 1);
    const now = new Date();
    const timeUntilResolve = resolveTime.getTime() - now.getTime();

    if (timeUntilResolve > 0) {
      const timer = setTimeout(() => {
        resolveMarket();
      }, timeUntilResolve);

      return () => clearTimeout(timer);
    }
  }, [endTime]);

  const handleResolve = () => {
    setIsConfirming(true);
    try {
      const resolveTime = new Date(Number(endTime) * 1000);
      resolveTime.setHours(resolveTime.getHours() + 24);
      toast({
        title: "Market Resolve Scheduled",
        description: `The market will automatically resolve at ${resolveTime.toLocaleString()}.`,
        duration: 5000, // 5 seconds
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Resolve Market Error",
        description: "There was an error scheduling the market resolve",
        variant: "destructive",
      });
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    // <div className="flex items-center justify-center">
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleResolve}
        disabled={isConfirming}
        // className="w-full"
        variant="outline"
        className="mb-2 bg-yellow-200 p-2 rounded-md text-center text-xs"
      >
        {isConfirming ? "Scheduling..." : "Pending Resolution"}
      </Button>
    </div>
  );
}
