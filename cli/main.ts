import { program } from "commander";
import { setupInitializeCommand } from "./commands/initialize";
import { setupSetReceiverCommand } from "./commands/set-receiver";
import { setupPauseCommand } from "./commands/pause";
import { setupResumeCommand } from "./commands/resume";

program
  .name("payment-processor-cli")
  .description("CLI to manage the Payment Processor Program on Solana")
  .version("1.0.0");

setupInitializeCommand(program);
setupSetReceiverCommand(program);
setupPauseCommand(program);
setupResumeCommand(program);

program.parse();
