import { Button } from "./ui/button";
import { prepareContractCall } from "thirdweb";
import { useSendAndConfirmTransaction } from "thirdweb/react";
import { contract, oracleContract } from "@/constants/contract";

interface MarketResolvedProps {
    marketId: number;
    outcome: number;
    optionA: string;
    optionB: string;
    category: 'Currency' | 'General';
}

export function MarketResolved({ 
    marketId,
    outcome, 
    optionA, 
    optionB,
    category
}: MarketResolvedProps) {
    const { mutateAsync: mutateTransaction } = useSendAndConfirmTransaction();

    const contractToUse = category === 'Currency' ? oracleContract : contract;

    const handleClaimRewards = async () => {
        try {
            const tx = await prepareContractCall({
                contract: contractToUse,
                method: "function claimWinnings(uint256 _marketId)",
                params: [BigInt(marketId)]
            });

            await mutateTransaction(tx);
            console.log('Rewards claimed');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="mb-2 bg-green-200 p-2 rounded-md text-center text-xs">
                Resolved: {outcome === 1 ? optionA : optionB}
            </div>
            <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleClaimRewards}
            >
                Claim Rewards
            </Button>
        </div>
    );
}