import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useActiveAccount, useSendAndConfirmTransaction } from "thirdweb/react";
import { useToast } from "@/hooks/use-toast";
import { prepareContractCall, readContract, toWei } from "thirdweb";
import { contract, oracleContract } from "@/constants/contract";
import { Loader2 } from "lucide-react";
import { priceFeedIds, getPriceFeedId } from "@/pricefeed/priceFeedIds";
import { HermesClient } from "@pythnetwork/hermes-client";

interface CreateCurrencyMarketDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function CreateCurrencyMarketDialog({
  isOpen,
  onOpenChange,
}: CreateCurrencyMarketDialogProps) {
  const [assetSymbol, setAssetSymbol] = useState("");
  const [condition, setCondition] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const { mutateAsync: mutateTransaction } = useSendAndConfirmTransaction();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<BigInt | null>(null);
  const [baseCurrency, setBaseCurrency] = useState("");
  const [quoteCurrency, setQuoteCurrency] = useState("");

  useEffect(() => {
    if (assetSymbol && condition && targetPrice && date) {
      const assetSymbols = assetSymbol?.split("/");
      const marketSymbol = assetSymbols ? assetSymbols[0].toUpperCase() : "";
      const quoteSymbol = assetSymbols ? assetSymbols[1].toUpperCase() : "";
      setSummary(
        `You are creating a market where 1 ${marketSymbol} ${condition} ${targetPrice} ${quoteSymbol} by ${new Date(
          date
        ).toLocaleString()}`
      );
    } else {
      setSummary("");
    }
  }, [assetSymbol, condition, targetPrice, date]);

  useEffect(() => {
    const fetchPrice = async () => {
      if (assetSymbol) {
        const connection = new HermesClient("https://hermes.pyth.network", {});
        const priceFeedId = getPriceFeedId(assetSymbol);
        const price = await connection.getLatestPriceUpdates([priceFeedId]);
        const priceValue = price
          ? BigInt(price.parsed[0].price.price) / BigInt(10 ** 8)
          : BigInt(0);
        setCurrentPrice(priceValue);
        const assetSymbols = assetSymbol?.split("/");
        setBaseCurrency(assetSymbols ? assetSymbols[0].toUpperCase() : "");
        setQuoteCurrency(assetSymbols ? assetSymbols[1].toUpperCase() : "");
      }
    };

    fetchPrice();
  }, [assetSymbol]);

  const handleCreateMarket = async () => {
    const duration =
      Math.floor(new Date(date).getTime() / 1000) -
      Math.floor(Date.now() / 1000);
    const num_condition = condition === ">" ? 0 : condition === "<" ? 1 : 2;
    setIsCreating(true);
    try {
      const tx = await prepareContractCall({
        contract: oracleContract,
        method:
          "function createMarket(string _assetSymbol, uint8 _operator, uint256 _targetPrice, uint256 _duration) returns (uint256)",
        params: [
          assetSymbol,
          num_condition,
          //   toWei(targetPrice),
          BigInt(targetPrice) * BigInt(10 ** 8),
          BigInt(duration),
        ],
      });
      await mutateTransaction(tx);

      // Show success toast
      toast({
        title: "Market Created",
        description: "Your market has been created successfully",
        duration: 5000, // 5 seconds
      });
    } catch (error) {
      console.error(error);
      // Optionally show error toast
      toast({
        title: "Create Market Error",
        description: "There was an error creating the market",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }

    setAssetSymbol("");
    setCondition("");
    setTargetPrice("");
    setDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Currency Market</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new currency market.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Asset Symbol:
            </label>
            <select
              className="w-full p-2 border rounded"
              value={assetSymbol}
              onChange={(e) => setAssetSymbol(e.target.value)}
            >
              <option value="">Select Asset Symbol</option>
              {Object.keys(priceFeedIds).map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
            {currentPrice !== null && (
              <div className="text-sm text-gray-700">
                Current Price: 1 {baseCurrency} = {currentPrice.toString()}{" "}
                {quoteCurrency}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Condition:
            </label>
            <select
              className="w-full p-2 border rounded"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">Select Condition</option>
              <option value=">">{">"}</option>
              <option value="<">{"<"}</option>
              <option value="=">{"="}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Target Price:
            </label>
            <input
              type="number"
              placeholder="e.g., 50000"
              className="w-full p-2 border rounded"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              On:
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {summary && <div className="text-sm text-gray-700">{summary}</div>}
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreateMarket}
            disabled={
              !assetSymbol || !condition || !targetPrice || !date || isCreating
            }
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateGeneralMarketDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function CreateGeneralMarketDialog({
  isOpen,
  onOpenChange,
}: CreateGeneralMarketDialogProps) {
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [date, setDate] = useState("");
  const [summary, setSummary] = useState("");
  const { mutateAsync: mutateTransaction } = useSendAndConfirmTransaction();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (question && optionA && optionB && date) {
      setSummary(
        `You are creating a market with the question: "${question}" and options: "${optionA}" and "${optionB}" by ${new Date(
          date
        ).toLocaleString()}`
      );
    } else {
      setSummary("");
    }
  }, [question, optionA, optionB, date]);

  const handleCreateMarket = async () => {
    const duration =
      Math.floor(new Date(date).getTime() / 1000) -
      Math.floor(Date.now() / 1000);
    setIsCreating(true);
    try {
      const tx = await prepareContractCall({
        contract: contract,
        method:
          "function createMarket(string _question, string _optionA, string _optionB, uint256 _duration) returns (uint256)",
        params: [question, optionA, optionB, BigInt(duration)],
      });
      await mutateTransaction(tx);

      // Show success toast
      toast({
        title: "Market Created",
        description: "Your market has been created successfully",
        duration: 5000, // 5 seconds
      });
    } catch (error) {
      console.error(error);
      // Optionally show error toast
      toast({
        title: "Create Market Error",
        description: "There was an error creating the market",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }

    setQuestion("");
    setOptionA("");
    setOptionB("");
    setDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create General Market</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new general market.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Question:
            </label>
            <input
              type="text"
              placeholder="e.g., Will it rain tomorrow?"
              className="w-full p-2 border rounded"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Option A:
            </label>
            <input
              type="text"
              placeholder="e.g., Yes"
              className="w-full p-2 border rounded"
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Option B:
            </label>
            <input
              type="text"
              placeholder="e.g., No"
              className="w-full p-2 border rounded"
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              On:
            </label>
            <input
              type="datetime-local"
              className="w-full p-2 border rounded"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          {summary && <div className="text-sm text-gray-700">{summary}</div>}
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreateMarket}
            disabled={!question || !optionA || !optionB || !date || isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create"
            )}
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
