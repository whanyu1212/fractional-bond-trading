"use client";

import { useReadContract } from "thirdweb/react";
import { bondContract } from "@/constants/contract";

export function GetNum() {
  const { data, isPending } = useReadContract({
    contract: bondContract,
    method: "function getActiveBondCount() view returns (uint256)",
    params: [],
  });

  console.log(data);
  return (
    <div>
      {isPending ? "Loading..." : `Active Bond Count: ${data}`}
    </div>
  );
}