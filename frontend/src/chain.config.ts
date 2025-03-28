import { defineChain } from "thirdweb";
const THIRDWEB_API_KEY = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_SECRET;
export const sepoliaTestnet = defineChain({
  id: 11155111, // Sepolia 测试网的 Chain ID
  name: "Sepolia Testnet",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpc: `https://11155111.rpc.thirdweb.com/${THIRDWEB_API_KEY}`, // Sepolia 测试网的公共 RPC 端点
  testnet: true,
});
