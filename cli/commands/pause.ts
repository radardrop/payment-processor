import { Command } from "commander";
import { CommandBaseOptions, CommandBaseParams } from "../type/base.type";
import { getBaseCommand, initCommand } from "./base-command";

type CommandParams = CommandBaseParams & CommandBaseOptions;

export const setupPauseCommand = (program: Command) => {
  getBaseCommand(program, "pause")
    .description("Pause a running program to prevent transactions")
    .action((programId: string, options: CommandBaseOptions) =>
      invoke({ programId, ...options })
    );
};

const invoke = async (params: CommandParams) => {
  const { program, paymentProcessor, wallet } = initCommand(params);

  console.log(`➡️ Pausing Program ${params.programId}`);

  const tx = await program.methods
    .pause()
    .accounts({
      paymentProcessor,
      payer: wallet.publicKey,
    })
    .signers([wallet.payer])
    .rpc();

  console.log(`✅ Transaction ${tx} sent`);
};
