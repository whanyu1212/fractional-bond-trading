import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

export function MarketPending() {
    const { toast } = useToast();

    const handleContactDeployer = () => {
        toast({
            title: "Contact Deployer",
            description: "Please contact the contract deployer to resolve the market.",
            duration: 5000,
        });
    };

    return (
        <div className="flex flex-col gap-2">
            <Button 
                onClick={handleContactDeployer}
                variant="outline"
                className="mb-2 bg-yellow-200 p-2 rounded-md text-center text-xs"
            >
                Pending resolution
            </Button>
        </div>
    );
}