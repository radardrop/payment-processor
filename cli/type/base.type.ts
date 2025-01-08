export type CommandBaseParams = {
  programId: string;
};

export type CommandBaseOptions = {
  cluster: "devnet" | "testnet" | "mainnet-beta";
  keypair: string;
};
