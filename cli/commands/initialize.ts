import { Command } from "commander";
import { parseBase58 } from "../utils/checks";
import { CommandBaseOptions, CommandBaseParams } from "../type/base.type";
import { getBaseCommand, initCommand } from "./base-command";
import * as anchor from "@coral-xyz/anchor";

type CommandOptions = {
  receiver: string;
  splMint: string;
};

type CommandParams = CommandBaseParams & CommandBaseOptions & CommandOptions;

export const setupInitializeCommand = (program: Command) => {
  getBaseCommand(program, "init")
    .description("Claim the program and setup the base state")
    .requiredOption(
      "-r, --receiver <receiver>",
      "The Solana wallet that will receive the SPL Tokens",
      parseBase58
    )
    .requiredOption(
      "-m, --spl-mint <spl-mint>",
      "The SPL Token Mint address",
      parseBase58
    )
    .action((programId: string, options: CommandBaseOptions & CommandOptions) =>
      invoke({ programId, ...options })
    );
};

const invoke = async (params: CommandParams) => {
  const { program, paymentProcessor, wallet } = initCommand(params);

  console.log("➡️ Initializing payment processor with:" + "\n");
  console.log(
    "  - Receiver:",
    new anchor.web3.PublicKey(params.receiver).toBase58()
  );
  console.log(
    "  - SPL Mint:",
    new anchor.web3.PublicKey(params.splMint).toBase58()
  );

  const tx = await program.methods
    .initialize(
      new anchor.web3.PublicKey(params.receiver),
      new anchor.web3.PublicKey(params.splMint)
    )
    .accounts({
      paymentProcessor,
      payer: wallet.publicKey,
    })
    .signers([wallet.payer])
    .rpc();

  console.log(`✅ Transaction ${tx} sent`);
};
