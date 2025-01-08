import { PublicKey } from "@solana/web3.js";
import { InvalidArgumentError } from "commander";

/**
 * This method makes sure the input is a valid base58 Solana address.
 *
 * @param input
 */
export const parseBase58 = (input: string) => {
  try {
    new PublicKey(input);
    return input;
  } catch {
    throw new InvalidArgumentError("Invalid Solana Base58 Address");
  }
};
