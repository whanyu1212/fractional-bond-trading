"use client";

import { useActiveAccount } from "thirdweb/react";
import { useEffect } from "react";
import { bondContract } from "@/constants/contract";

export function UserAddress() {
  const account = useActiveAccount();

  useEffect(() => {
    if (account) {
      console.log("Connected wallet address:", account.address);
    } else {
      console.log("No wallet connected");
    }
  }, [account]);

  return (
    <div>
      {account ? (
        <p>Connected wallet address: {account.address}</p>
      ) : (
        <p>No wallet connected</p>
      )}
    </div>
  );
}
