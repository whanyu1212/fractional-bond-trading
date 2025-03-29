import Homepage from "@/components/homepage/Homepage";
import PredictionMarketDashboard from "@/components/predictionMarketDashboard";
import CreateBond from "@/components/test";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { UserAddress } from "@/components/user";
import { Footer } from "@/components/footer";
import { ThirdwebProvider } from "thirdweb/react";
import { GetNum } from "@/components/test_all";

export default function Home() {
  return (
    <ThirdwebProvider>
      <Toaster />
      <Navbar />

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
