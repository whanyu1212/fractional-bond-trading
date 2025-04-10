import Homepage from "@/components/homepage/Homepage";
import PredictionMarketDashboard from "@/components/predictionMarketDashboard";
import CreateBond from "@/components/test";
import { UserAddress } from "@/components/user";
import { Footer } from "@/components/footer";
import { ThirdwebProvider } from "thirdweb/react";
import { GetNum } from "@/components/test_all";

export default function Home() {
  return (
    <ThirdwebProvider>

      {/* --- Main homepage content (your modern hero sections, etc) --- */}
      <Homepage />

      {/* --- Optional: Uncomment components below if needed --- */}
      {/* <UserAddress /> */}
      {/* <GetNum /> */}
      {/* <CreateBond /> */}
      {/* <PredictionMarketDashboard /> */}

      <Footer />
    </ThirdwebProvider>
  );
}
