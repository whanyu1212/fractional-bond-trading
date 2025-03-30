import { client } from "@/app/client";
import { defineChain, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
// import { sepoliaTestnet } from "@/chain.config";

export const bondFactoryAddress = "0x6d009Ec19f8c90b52d0229f4Cd34686465bEf48c";
export const mockStableCoinAddress = "0x4b84D11FAD4dD6fb6277E055D0892023456eeCFc";
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
