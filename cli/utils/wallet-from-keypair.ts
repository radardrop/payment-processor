import * as fs from "fs";
import { Keypair } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";

export const getWalletFromKeypair = (path: string) => {
  const secretKey = JSON.parse(fs.readFileSync(path, "utf8"));
  return new Wallet(Keypair.fromSecretKey(Uint8Array.from(secretKey)));
};
