import { Command } from "commander";
import { CommandBaseOptions, CommandBaseParams } from "../type/base.type";
import { getBaseCommand, initCommand } from "./base-command";

type CommandParams = CommandBaseParams & CommandBaseOptions;

export const setupStateCommand = (program: Command) => {
  getBaseCommand(program, "state")
    .description("Get the System Program State")
    .action((programId: string, options: CommandBaseOptions) =>
      invoke({ programId, ...options })
    );
};

const invoke = async (params: CommandParams) => {
  const { program, paymentProcessor } = initCommand(params);

  console.log(`➡️ Getting the state for Program ${params.programId}`);

  const state = await program.account.paymentProcessor.fetch(paymentProcessor);

  console.log(`-- Owner   : ${state.owner.toBase58()}`);
  console.log(`-- Receiver: ${state.receiver.toBase58()}`);
  console.log(`-- Mint    : ${state.mint.toBase58()}`);
  console.log(`-- Paused  : ${state.paused}`);
};
