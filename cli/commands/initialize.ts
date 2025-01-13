import { Command } from "commander";
import { parseBase58 } from "../utils/checks";
import { CommandBaseOptions, CommandBaseParams } from "../type/base.type";
import { getBaseCommand, initCommand } from "./base-command";
import * as anchor from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccount,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { sendAndConfirmTransaction, Transaction } from "@solana/web3.js";

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
  const { program, paymentProcessor, wallet, connection } = initCommand(params);

  const mintPubkey = new anchor.web3.PublicKey(params.splMint);
  const receiverPubkey = new anchor.web3.PublicKey(params.receiver);

  console.log("➡️ Initializing payment processor with:" + "\n");
  console.log("  - Receiver:", receiverPubkey.toBase58());
  console.log("  - SPL Mint:", mintPubkey.toBase58());

  const tx = await program.methods
    .initialize(receiverPubkey, mintPubkey)
    .accounts({
      // @ts-ignore
      paymentProcessor,
      payer: wallet.publicKey,
    })
    .signers([wallet.payer])
    .rpc();

  console.log(`✅ Transaction ${tx} sent`);

  const receiverTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    receiverPubkey
  );

  const transaction = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      receiverTokenAccount,
      receiverPubkey,
      mintPubkey,
      program.programId
    )
  );

  const accountTx = await sendAndConfirmTransaction(connection, transaction, [
    wallet.payer,
  ]);

  console.log("=> Created associated token account:", accountTx);
};
