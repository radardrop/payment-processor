import { Command } from "commander";
import { parseBase58 } from "../utils/checks";
import { CommandBaseOptions, CommandBaseParams } from "../type/base.type";
import { getBaseCommand, initCommand } from "./base-command";
import * as anchor from "@coral-xyz/anchor";

type CommandOptions = {
  receiver: string;
};

type CommandParams = CommandBaseParams & CommandBaseOptions & CommandOptions;

export const setupSetReceiverCommand = (program: Command) => {
  getBaseCommand(program, "set-receiver")
    .description("Set the SPL-Token receiver for the program")
    .requiredOption(
      "-r, --receiver <receiver>",
      "The Solana wallet that will receive the SPL Tokens",
      parseBase58
    )
    .action((programId: string, options: CommandBaseOptions & CommandOptions) =>
      invoke({ programId, ...options })
    );
};

const invoke = async (params: CommandParams) => {
  const { program, paymentProcessor, wallet } = initCommand(params);

  console.log("➡️ Setting receiver to:", params.receiver);

  const tx = await program.methods
    .setReceiver(new anchor.web3.PublicKey(params.receiver))
    .accounts({
      paymentProcessor,
      payer: wallet.publicKey,
    })
    .signers([wallet.payer])
    .rpc();

  console.log(`✅ Transaction ${tx} sent`);
};
