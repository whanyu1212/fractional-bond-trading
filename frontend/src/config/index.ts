import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
  hardhat,
  localhost,
} from "wagmi/chains";
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  injectedWallet,
  coinbaseWallet,
  imTokenWallet,
  okxWallet,
  coreWallet,
  argentWallet,
  trustWallet,
  uniswapWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";

export const config = getDefaultConfig({
  appName: "my-app-wallet",
  projectId: "5e6260fddc2059c2b3d6e697283a05a0",
  chains: [
    localhost,
    hardhat,
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia,
  ],
  wallets: [
    {
      groupName: "Popular",
      wallets: [
        metaMaskWallet,
        rainbowWallet,
        walletConnectWallet,
        coinbaseWallet,
      ],
    },
    {
      groupName: "More",
      wallets: [
        okxWallet,
        trustWallet,
        argentWallet,
        uniswapWallet,
        coreWallet,
        imTokenWallet,
        phantomWallet,
        injectedWallet,
      ],
    },
  ],
});
