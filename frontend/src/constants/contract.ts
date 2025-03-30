import { client } from "@/app/client";
import { defineChain, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
// import { sepoliaTestnet } from "@/chain.config";

export const bondFactoryAddress = "0xa1173C4BEeEDAa3BbE01Fc461A4a83319aA7DbAA";
export const mockStableCoinAddress = "0x4b84D11FAD4dD6fb6277E055D0892023456eeCFc";
export const BondMarketPlaceAddress = "0xd5B44461c1Ac4fD686b5322691D8eB82636bC9f9";
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
