import { client } from "@/app/client";
import { defineChain, getContract } from "thirdweb";
import { base } from "thirdweb/chains";
// import { sepoliaTestnet } from "@/chain.config";

export const bondFactoryAddress = "0x8f0CEd3a1a468d9A4968879F918Bcfb18DA8dc24";
export const mockStableCoinAddress = "0x9A1ac536dCFa4ddf7a219AcF70F9CFd25660eFFf";
export const BondMarketPlaceAddress = "0xF66B3B3F6DdD8260B47eE1b00e7ab0e81965Bfd7";
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

export const bondMarketPlaceContract = getContract({
    client: client,
    // chain: base,
    address: BondMarketPlaceAddress,
    chain: sepoliaTestnet
});