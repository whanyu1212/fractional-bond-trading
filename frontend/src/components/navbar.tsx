"use client";

import Link from "next/link";
import { prepareContractCall } from "thirdweb";
import { client } from "@/app/client";
// import { kaiaTestnet } from "@/chain.config";

import { sepoliaTestnet } from "@/chain.config";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveAccount, lightTheme} from "thirdweb/react";
import {
  inAppWallet,
  createWallet,
} from "thirdweb/wallets";

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

export function Navbar() {
  const account = useActiveAccount();
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const { toast } = useToast();



  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
  
        <h1 className="text-2xl font-bold m-0"> Bond Market</h1>
      </div>

      <div className="flex items-center gap-6">
        <Link href="/market" className="text-lg font-medium text-gray-700 hover:text-blue-500">
          Market
        </Link>
       
        <Link href="/trade" className="text-lg font-medium text-gray-700 hover:text-blue-500">
          Trading Center
        </Link>

        <Link href="/account" className="text-lg font-medium text-gray-700 hover:text-blue-500">
          My Account
        </Link>

      </div>


      <div className="items-center flex gap-2">

        
      <ConnectButton
      client={client}
      wallets={wallets}
      theme={lightTheme({
        colors: {
          accentText: "hsl(216, 46%, 45%)",
          borderColor: "hsl(262, 11%, 86%)",
        },
      })}
      connectModal={{ size: "wide" }}
     />
      </div>
    </div>
  );
}
