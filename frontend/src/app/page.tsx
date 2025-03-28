import PredictionMarketDashboard from "@/components/predictionMarketDashboard";
import Image from "next/image";
import CreateBond from "@/components/test";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import {UserAddress} from "@/components/user";
import { Footer } from "@/components/footer";
import { ThirdwebProvider } from "thirdweb/react";

import { GetNum } from "@/components/test_all";
export default function Home() {
  return (
    <>
    <ThirdwebProvider>
      <Toaster />
      <Navbar />
      {/* <UserAddress /> */}
     
      {/* <GetNum /> */}
      
      {/* <CreateBond /> */}
      {/* <PredictionMarketDashboard /> */}
      <Footer />
    </ThirdwebProvider>
     
    </>
  );
}
