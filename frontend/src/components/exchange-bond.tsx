"use client";

import { useState } from "react";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle } from "lucide-react";
import { bondMarketPlaceContract } from "@/constants/contract";
import { useToast } from "@/hooks/use-toast";

interface ExchangeBondProps {
  isOpen: boolean;
  onClose: () => void;
  bondId: number;
  fromAddress: string;
}

// Interface for form data
interface ExchangeForm {
  bondId: number;
  fromAddress: string;
  toAddress: string;
  tokenAmount: number;
  stablecoinAmount: number;
}

export default function ExchangeBond({ isOpen, onClose, bondId, fromAddress }: ExchangeBondProps) {
  const { mutate: sendTransaction } = useSendTransaction();
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  // Form state
  const [form, setForm] = useState<ExchangeForm>({
    bondId: bondId,
    fromAddress: fromAddress,
    toAddress: '',
    tokenAmount: 1,
    stablecoinAmount: 1,
  });

  // Update form when props change
  useState(() => {
    setForm({
      ...form,
      bondId,
      fromAddress,
    });
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === 'tokenAmount' || name === 'stablecoinAmount' ? Number(value) : value,
    });
  };

  // Handle token amount increment
  const handleIncrementToken = () => {
    setForm({
      ...form,
      tokenAmount: form.tokenAmount + 1
    });
  };

  // Handle stablecoin amount increment
  const handleIncrementStablecoin = () => {
    setForm({
      ...form,
      stablecoinAmount: form.stablecoinAmount + 1
    });
  };

  // Format address for display
  const formatAddress = (address: string): string => {
    if (!address) return "Unknown";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle exchange submission
  const handleExchangeSubmit = async () => {
    if (!form.toAddress) {
      toast({
        title: "Error",
        description: "Please enter a recipient address",
        duration: 3000,
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      // Prepare the contract call
      const transaction = prepareContractCall({
        contract: bondMarketPlaceContract,
        method: "function exchangeBonds(uint256 bondId, address from, address to, uint256 tokenAmount, uint256 stablecoinAmount)",
        params: [
          BigInt(form.bondId),
          form.fromAddress,
          form.toAddress,
          BigInt(form.tokenAmount),
          BigInt(form.stablecoinAmount),
        ]
      });
      
      // Send the transaction
      sendTransaction(transaction, {
        onSuccess: () => {
          toast({
            title: "Success!",
            description: `Bond #${form.bondId} has been exchanged successfully.`,
            duration: 5000,
          });
          setIsProcessing(false);
          onClose();
        },
        onError: (error) => {
          console.error("Transaction failed:", error);
          toast({
            title: "Transaction Failed",
            description: error instanceof Error ? error.message : "Failed to exchange bond",
            duration: 5000,
          });
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error("Error preparing transaction:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to prepare transaction",
        duration: 5000,
      });
      setIsProcessing(false);
    }
  };

  // View transaction preview
  const handleViewTransaction = () => {
    toast({
      title: "Transaction Preview",
      description: `Exchange Bond #${form.bondId} from ${formatAddress(form.fromAddress)} to ${formatAddress(form.toAddress || "...")}`,
      duration: 3000,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Bond #{bondId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bondId">Bond ID (uint256)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bondId"
                name="bondId"
                type="number"
                value={form.bondId}
                readOnly
                className="bg-gray-50"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full p-0 border-blue-200"
                disabled
              >
                <PlusCircle className="h-4 w-4 text-blue-400" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromAddress">From (address)</Label>
            <Input
              id="fromAddress"
              name="fromAddress"
              value={form.fromAddress}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="toAddress">To (address)</Label>
            <Input
              id="toAddress"
              name="toAddress"
              value={form.toAddress}
              onChange={handleInputChange}
              placeholder="Enter recipient address"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenAmount">Token Amount (uint256)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="tokenAmount"
                name="tokenAmount"
                type="number"
                value={form.tokenAmount}
                onChange={handleInputChange}
                min={1}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full p-0 border-blue-200"
                onClick={handleIncrementToken}
              >
                <PlusCircle className="h-4 w-4 text-blue-400" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stablecoinAmount">Stablecoin Amount (uint256)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="stablecoinAmount"
                name="stablecoinAmount"
                type="number"
                value={form.stablecoinAmount}
                onChange={handleInputChange}
                min={1}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-full p-0 border-blue-200"
                onClick={handleIncrementStablecoin}
              >
                <PlusCircle className="h-4 w-4 text-blue-400" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleViewTransaction}
              disabled={isProcessing || !form.toAddress}
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              Preview your transaction
            </Button>
            <Button
              onClick={handleExchangeSubmit}
              disabled={isProcessing || !form.toAddress}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Execute"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}