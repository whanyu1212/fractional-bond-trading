import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { contract, oracleContract } from "@/constants/contract";
import { MarketProgress } from "./market-progress";
import { MarketTime } from "./market-time";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { MarketResolved } from "./market-resolved";
import { MarketPending } from "./market-pending";
import { MarketBuyInterface } from "./market-buy-interface";
import { MarketSharesDisplay } from "./market-shares-display";
import { MarketResolveInterface } from "./market-resolve-interface";
import { toEther } from "thirdweb";

// Props for the MarketCard component
// index is the market id
// filter is the filter to apply to the market
// category is the category of the market
interface MarketCardProps {
  index: number;
  filter: "active" | "pending" | "resolved";
  category: "Currency" | "General";
  onClick: (index: number, title: string) => void; // 修改 onClick 属性
}

// Interface for the currency market data
interface CurrencyMarket {
  assetSymbol: string;
  operator: number;
  targetPrice: bigint;
  endTime: bigint;
  outcome: number;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
}

enum ComparisonOperator {
  GREATER_THAN,
  LESS_THAN,
  EQUAL,
}

const operatorToSymbol = (operator: number): string => {
  switch (operator) {
    case ComparisonOperator.GREATER_THAN:
      return ">";
    case ComparisonOperator.LESS_THAN:
      return "<";
    case ComparisonOperator.EQUAL:
      return "=";
    default:
      return "";
  }
};

// Interface for the general market data
interface GeneralMarket {
  question: string;
  endTime: bigint;
  outcome: number;
  optionA: string;
  optionB: string;
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
}

// Interface for the shares balance
interface SharesBalance {
  optionAShares: bigint;
  optionBShares: bigint;
}

export function MarketCard({
  index,
  filter,
  category,
  onClick,
}: MarketCardProps) {
  // Get the active account
  const account = useActiveAccount();

  // Determine the contract and method to use based on the category
  const contractToUse = category === "Currency" ? oracleContract : contract;
  const methodToUse =
    category === "Currency"
      ? "function getMarketInfo(uint256 _marketId) view returns (string assetSymbol, uint8 operator, uint256 targetPrice, uint256 endTime,uint256 duration, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)"
      : "function getMarketInfo(uint256 _marketId) view returns (string question, uint256 endTime,uint256 duration, uint8 outcome, string optionA, string optionB, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)";

  // Get the market data
  const { data: marketData, isLoading: isLoadingMarketData } = useReadContract({
    contract: contractToUse,
    method: methodToUse,
    params: [BigInt(index)],
  });

  // Parse the market data
  const market: CurrencyMarket | GeneralMarket | undefined = marketData
    ? category === "Currency"
      ? {
          assetSymbol: marketData[0],
          operator: marketData[1],
          targetPrice: marketData[2],
          endTime: marketData[3],
          duration: marketData[4],
          outcome: marketData[5],
          totalOptionAShares: marketData[6],
          totalOptionBShares: marketData[7],
          resolved: marketData[8],
        }
      : {
          question: marketData[0],
          endTime: marketData[1],
          duration: marketData[2],
          outcome: marketData[3],
          optionA: marketData[4],
          optionB: marketData[5],
          totalOptionAShares: marketData[6],
          totalOptionBShares: marketData[7],
          resolved: marketData[8],
        }
    : undefined;

  // Get the shares balance
  const { data: sharesBalanceData } = useReadContract({
    contract: contractToUse,
    method:
      "function getSharesBalance(uint256 _marketId, address _user) view returns (uint256 optionAShares, uint256 optionBShares)",
    params: [BigInt(index), account?.address as string],
  });

  console.log(sharesBalanceData);

  // Parse the shares balance
  const sharesBalance: SharesBalance | undefined = sharesBalanceData
    ? {
        optionAShares: sharesBalanceData[0],
        optionBShares: sharesBalanceData[1],
      }
    : undefined;

  // Check if the market is expired
  const isExpired = new Date(Number(market?.endTime) * 1000) < new Date();
  // Check if the market is resolved
  const isResolved = market?.resolved;

  // Check if the market should be shown
  const shouldShow = () => {
    if (!market) return false;

    switch (filter) {
      case "active":
        return !isExpired;
      case "pending":
        return isExpired && !isResolved;
      case "resolved":
        return isExpired && isResolved;
      default:
        return true;
    }
  };

  // If the market should not be shown, return null
  if (!shouldShow()) {
    return null;
  }

  const assetSymbols = market?.assetSymbol?.split("/");
  const marketSymbol = assetSymbols ? assetSymbols[0].toUpperCase() : "";
  const quoteSymbol = assetSymbols ? assetSymbols[1].toUpperCase() : "";

  const title =
    category === "Currency"
      ? `1 ${marketSymbol} ${operatorToSymbol(market?.operator)} ${Math.floor(
          parseInt(BigInt(market?.targetPrice) / BigInt(10 ** 8))
        )} ${quoteSymbol}?`
      : market?.question;

  return (
    <Card
      key={index}
      className="flex flex-col transition-colors duration-300 ease-in-out cursor-pointer hover:bg-gray-200"
      onClick={() => onClick(index, title)}
    >
      {isLoadingMarketData ? (
        <MarketCardSkeleton />
      ) : (
        <>
          <CardHeader>
            {market && (
              <MarketTime
                endTime={market.endTime}
                category={category}
                isResolved={isResolved}
              />
            )}
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            {market && (
              <MarketProgress
                optionA={category === "Currency" ? "Yes" : market.optionA}
                optionB={category === "Currency" ? "No" : market.optionB}
                totalOptionAShares={market.totalOptionAShares}
                totalOptionBShares={market.totalOptionBShares}
              />
            )}
            {new Date(Number(market?.endTime) * 1000) < new Date() ? (
              market?.resolved ? (
                <MarketResolved
                  marketId={index}
                  outcome={market.outcome}
                  optionA={category === "Currency" ? "Yes" : market.optionA}
                  optionB={category === "Currency" ? "No" : market.optionB}
                  category={category}
                />
              ) : (
                <>
                  {category === "Currency" ? (
                    <MarketResolveInterface
                      marketId={index}
                      endTime={market?.endTime}
                      assetSymbol={market?.assetSymbol}
                      operator={market?.operator}
                      targetPrice={market?.targetPrice}
                    />
                  ) : (
                    <MarketPending />
                  )}
                </>
              )
            ) : (
              <MarketBuyInterface
                marketId={index}
                market={market!}
                category={category}
              />
            )}
          </CardContent>
          <CardFooter>
            {market && sharesBalance && (
              <MarketSharesDisplay
                market={market}
                sharesBalance={sharesBalance}
                category={category}
              />
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
}
