import { useEffect, useState } from "react";
import {
  useAddress,
  useContract,
  useContractWrite,
  ConnectWallet,
} from "@thirdweb-dev/react";
import { ethers } from "ethers";

function Wallet() {
  const address = useAddress();
  const [balance, setBalance] = useState("0.00");

  const { contract } = useContract("0x7573492A25674f1359261720A7Bcf6CDDbea04ae");
  const { mutateAsync: mintToken, isLoading } = useContractWrite(contract, "mint");

  useEffect(() => {
    if (contract && address) {
      (async () => {
        try {
          const raw = await contract.call("balanceOf", [address]);
          const formatted = ethers.utils.formatUnits(raw, 6);
          setBalance(formatted);
        } catch (err) {
          console.error("Error fetching balance:", err);
        }
      })();
    }
  }, [contract, address]);

  const handleMint = async () => {
    try {
      const amount = ethers.utils.parseUnits("10000", 6);
      const tx = await mintToken({ args: [address, amount] });
      console.log("Mint success:", tx);
      alert("Successfully minted 10,000 BDC!");
    } catch (err: any) {
      console.error("Mint failed:", err?.message || err);
      alert("Minting failed. You might not be the owner.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <ConnectWallet />
      {address && (
        <>
          <p><strong>Address:</strong> {address}</p>
          <p><strong>BDC Balance:</strong> {balance}</p>
          <button onClick={handleMint} disabled={isLoading}>
            {isLoading ? "Minting..." : "Claim 10,000 BDC"}
          </button>
        </>
      )}
    </div>
  );
}

export default Wallet;
