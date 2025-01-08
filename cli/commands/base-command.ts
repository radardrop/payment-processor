import { Command, Option } from "commander";
import { parseBase58 } from "../utils/checks";
import { CommandBaseOptions, CommandBaseParams } from "../type/base.type";
import { PublicKey } from "@solana/web3.js";
import { getWalletFromKeypair } from "../utils/wallet-from-keypair";
import * as anchor from "@coral-xyz/anchor";
import idl from "../../target/idl/payment_processor.json";

export const getBaseCommand = (program: Command, name: string) => {
  const homePath = process.env.HOME || process.env.USERPROFILE || "/root";
  return program
    .command(name)
    .argument("<programId>", "The Solana Program Id", parseBase58)
    .addOption(
      new Option("-c, --cluster <cluster>", "The cluster to use")
        .choices(["devnet", "testnet", "mainnet-beta"])
        .default("devnet")
    )
    .addOption(
      new Option(
        "-k, --keypair <keypair>",
        "The Solana keypair to use"
      ).default(`${homePath}/.config/solana/id.json`)
    );
};

export const initCommand = (params: CommandBaseParams & CommandBaseOptions) => {
  const programId = new PublicKey(params.programId);
  const wallet = getWalletFromKeypair(params.keypair);
  const connection = new anchor.web3.Connection(
    anchor.web3.clusterApiUrl(params.cluster),
    "confirmed"
  );
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  const program = new anchor.Program(idl as anchor.Idl, provider);

  const [paymentProcessor] = PublicKey.findProgramAddressSync(
    [anchor.utils.bytes.utf8.encode("payment_processor")],
    new anchor.web3.PublicKey(programId)
  );

  return {
    programId,
    wallet,
    connection,
    provider,
    program,
    paymentProcessor,
  };
};
