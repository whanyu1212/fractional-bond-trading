"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { client } from "@/app/client";
import { ConnectButton, useActiveAccount, lightTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

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
  const { toast } = useToast();
  const [isClaimLoading, setIsClaimLoading] = useState(false);

  return (
    <nav className="w-full flex justify-between items-center px-6 py-4 border-b bg-white shadow-sm">
      {/* Left: Logo */}
      <Link href="/" className="flex items-center space-x-3">
        <Image
          src="/images/logo.png"
          alt="Crypto Exchange Logo"
          width={36}
          height={36}
          className="rounded-md"
        />
        <span className="text-2xl font-semibold text-gray-800">
          Bond Market
        </span>
      </Link>

      {/* Center: Links */}
      <div className="flex items-center gap-6">
        <Link
          href="/market"
          className="text-lg font-medium text-gray-700 hover:text-blue-500"
        >
          Market
        </Link>
        <Link
          href="/trade"
          className="text-lg font-medium text-gray-700 hover:text-blue-500"
        >
          Trading Center
        </Link>
        <Link
          href="/account"
          className="text-lg font-medium text-gray-700 hover:text-blue-500"
        >
          My Account
        </Link>
      </div>

      {/* Right: Wallet */}
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
    </nav>
  );
}
