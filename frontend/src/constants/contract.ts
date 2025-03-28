import { client } from "@/app/client";
import { defineChain, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
// import { sepoliaTestnet } from "@/chain.config";

export const bondFactoryAddress = "0xDDdB03448d4dbBd3E6A6B945B0813a5147AE535b";
export const mockStableCoinAddress = "0x7573492A25674f1359261720A7Bcf6CDDbea04ae";
const sepoliaTestnet = defineChain(11155111);

export const bondContract = getContract({
    client: client,
    
    // chain: base,
    address: bondFactoryAddress,
    chain: sepoliaTestnet
});

export const coinContract = getContract({
    client: client,
    // chain: base,
    address: mockStableCoinAddress,
    chain: sepoliaTestnet
});
