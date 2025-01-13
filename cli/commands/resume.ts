import { Command } from "commander";
import { CommandBaseOptions, CommandBaseParams } from "../type/base.type";
import { getBaseCommand, initCommand } from "./base-command";

type CommandParams = CommandBaseParams & CommandBaseOptions;

export const setupResumeCommand = (program: Command) => {
  getBaseCommand(program, "resume")
    .description("Resume a paused program to allow transactions")
    .action((programId: string, options: CommandBaseOptions) =>
      invoke({ programId, ...options })
    );
};

const invoke = async (params: CommandParams) => {
  const { program, paymentProcessor, wallet } = initCommand(params);

  console.log(`➡️ Resuming Program ${params.programId}`);

  const tx = await program.methods
    .unpause()
    .accounts({
      paymentProcessor,
      // @ts-ignore
      payer: wallet.publicKey,
    })
    .signers([wallet.payer])
    .rpc();

  console.log(`✅ Transaction ${tx} sent`);
};
