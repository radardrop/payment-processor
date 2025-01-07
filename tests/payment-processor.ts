import * as anchor from "@coral-xyz/anchor";
import {Program} from "@coral-xyz/anchor";
import {PaymentProcessor} from "../target/types/payment_processor";
import {Keypair, PublicKey, SystemProgram} from "@solana/web3.js";
import {createMint, getAccount, getOrCreateAssociatedTokenAccount, mintTo} from "@solana/spl-token";
import {expect} from "chai";

describe("payment-processor", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PaymentProcessor as Program<PaymentProcessor>;

  // Keypairs
  let paymentProcessorKeypair: Keypair;
  let receiverKeypair: Keypair;
  let payerKeypair: Keypair;
  let ownerKeypair: Keypair;

  // We'll store relevant addresses here
  let paymentProcessorPubkey: PublicKey;
  let rdaiMintPubkey: PublicKey;       // "RDAI" or your SPL token
  let payerTokenAccount: PublicKey;
  let receiverTokenAccount: PublicKey;

  before(async () => {
    paymentProcessorKeypair = Keypair.generate();
    receiverKeypair = Keypair.generate();
    payerKeypair = Keypair.generate();
    ownerKeypair = Keypair.generate();

    let signature = await provider.connection.requestAirdrop(payerKeypair.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    let blockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      signature,
    })

    console.log(
      "Payer address:",
      payerKeypair.publicKey.toBase58(),
      "Payer lamports:",
      await provider.connection.getBalance(payerKeypair.publicKey)
    )

    signature = await provider.connection.requestAirdrop(ownerKeypair.publicKey, anchor.web3.LAMPORTS_PER_SOL);
    blockhash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      blockhash: blockhash.blockhash,
      lastValidBlockHeight: blockhash.lastValidBlockHeight,
      signature,
    })

    console.log(
      "Owner address:",
      ownerKeypair.publicKey.toBase58(),
      "Owner lamports:",
      await provider.connection.getBalance(ownerKeypair.publicKey)
    )
  })

  const fetchPaymentProcessor = async (pubkey: PublicKey) => {
    return await program.account.paymentProcessor.fetch(pubkey);
  };

  it('should initialize the payment processor', async () => {
    rdaiMintPubkey = await createMint(
      provider.connection,
      ownerKeypair,
      ownerKeypair.publicKey,
      null,
      9
    );

    await program.methods.initialize(receiverKeypair.publicKey, rdaiMintPubkey).accounts({
      paymentProcessor: paymentProcessorKeypair.publicKey,
      payer: ownerKeypair.publicKey,
    }).signers([paymentProcessorKeypair, ownerKeypair]).rpc()

    paymentProcessorPubkey = paymentProcessorKeypair.publicKey;

    const state = await fetchPaymentProcessor(paymentProcessorPubkey);
    expect(state.owner.toBase58()).to.equal(ownerKeypair.publicKey.toBase58());
    expect(state.receiver.toBase58()).to.equal(receiverKeypair.publicKey.toBase58());
    expect(state.mint.toBase58()).to.equal(rdaiMintPubkey.toBase58());
    expect(state.paused).to.be.false;

    console.log("PaymentProcessor initialized with RDAI mint:", rdaiMintPubkey.toBase58());
  })

  it('should create accounts and mint tokens to payer', async () => {
    payerTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payerKeypair,
        rdaiMintPubkey,
        payerKeypair.publicKey,
      )
    ).address;

    receiverTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payerKeypair,
        rdaiMintPubkey,
        receiverKeypair.publicKey
      )
    ).address

    await mintTo(
      provider.connection,
      ownerKeypair,
      rdaiMintPubkey,
      payerTokenAccount,
      ownerKeypair,
      1_000_000_000,
    )

    const payerAccountInfo = await getAccount(provider.connection, payerTokenAccount)
    expect(Number(payerAccountInfo.amount)).to.equal(1_000_000_000);

    console.log('Payer minted balance:', Number(payerAccountInfo.amount));
  })

  it('should pay correctly', async () => {
    const amount = new anchor.BN(100_000_000); // 0.1 with 9 decimals
    const paymentId = new anchor.BN(123);

    const payerBefore = await getAccount(provider.connection, payerTokenAccount);
    const receiverBefore = await getAccount(provider.connection, receiverTokenAccount);

    console.log(
      "Payer balance before pay:",
      Number(payerBefore.amount),
      "Receiver balance before pay:",
      Number(receiverBefore.amount),
    )

    await program.methods.pay(amount, paymentId).accounts({
      payer: payerKeypair.publicKey,
      payerTokenAccount: payerTokenAccount,
      receiverTokenAccount: receiverTokenAccount,
      paymentProcessor: paymentProcessorPubkey,
    }).signers([payerKeypair]).rpc()

    const payerAfter = await getAccount(provider.connection, payerTokenAccount);
    const receiverAfter = await getAccount(provider.connection, receiverTokenAccount);

    expect(Number(payerAfter.amount)).to.equal(Number(payerBefore.amount) - Number(amount));
    expect(Number(receiverAfter.amount)).to.equal(Number(receiverBefore.amount) + Number(amount));

    console.log(
      "Payer balance after pay:",
      Number(payerAfter.amount),
      "Receiver balance after pay:",
      Number(receiverAfter.amount),)
  })

  it('should not pay correctly (attempt to pay with another mint)', async () => {
    const fakeMint = await createMint(provider.connection, payerKeypair, payerKeypair.publicKey, null, 9);
    console.log('Created fake mint:', fakeMint.toBase58());

    const fakePayerTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payerKeypair,
        fakeMint,
        payerKeypair.publicKey,
      )
    ).address;

    await mintTo(
      provider.connection,
      payerKeypair,
      fakeMint,
      fakePayerTokenAccount,
      payerKeypair.publicKey,
      1_000_000,
    )

    try {
      await program.methods.pay(new anchor.BN(50_000), new anchor.BN(123)).accounts({
        payer: payerKeypair.publicKey,
        payerTokenAccount: fakePayerTokenAccount,
        receiverTokenAccount: receiverTokenAccount,
        paymentProcessor: paymentProcessorPubkey,
      }).signers([payerKeypair]).rpc();

      throw new Error('Payment with invalid mint unexpectedly succeeded');
    } catch (e) {
      expect(e.error.errorMessage).to.include('The mint of the provided token account does not match the PaymentProcessor')
    }
  })

  it('should change the receiver', async () => {
    const newReceiver = Keypair.generate();
    await program.methods.setReceiver(newReceiver.publicKey)
      .accounts({
        paymentProcessor: paymentProcessorPubkey,
        // @ts-ignore
        owner: ownerKeypair.publicKey
      })
      .signers([ownerKeypair])
      .rpc();

    const state = await fetchPaymentProcessor(paymentProcessorPubkey);
    expect(state.receiver.toBase58()).to.equal(newReceiver.publicKey.toBase58());

    console.log('Receiver changed to:', newReceiver.publicKey.toBase58());

    // Update back the receiver to the old one
    await program.methods.setReceiver(receiverKeypair.publicKey)
      .accounts({
        paymentProcessor: paymentProcessorPubkey,
        // @ts-ignore
        owner: ownerKeypair.publicKey
      })
      .signers([ownerKeypair])
      .rpc();

    const state2 = await fetchPaymentProcessor(paymentProcessorPubkey);
    expect(state2.receiver.toBase58()).to.equal(receiverKeypair.publicKey.toBase58());

    console.log('Receiver changed back to:', receiverKeypair.publicKey.toBase58());
  })

  it('should pause and resume the payments and prevent payments while paused', async () => {
    await program.methods.pause().accounts({
      paymentProcessor: paymentProcessorPubkey,
      // @ts-ignore
      owner: ownerKeypair.publicKey,
    }).signers([ownerKeypair]).rpc();


    let state = await fetchPaymentProcessor(paymentProcessorPubkey);
    expect(state.paused).to.be.true;

    console.log('Payment processor paused');

    try {
      await program.methods.pay(new anchor.BN(50_000), new anchor.BN(123)).accounts({
        payer: payerKeypair.publicKey,
        payerTokenAccount: payerTokenAccount,
        receiverTokenAccount: receiverTokenAccount,
        paymentProcessor: paymentProcessorPubkey,
      }).signers([payerKeypair]).rpc();

      throw new Error('Payment succeeded while paused');
    } catch (e) {
      expect(e.error.errorMessage).to.include('PaymentProcessor is paused');
    }

    await program.methods.unpause().accounts({
      paymentProcessor: paymentProcessorPubkey,
      // @ts-ignore
      owner: ownerKeypair.publicKey,
    }).signers([ownerKeypair]).rpc();

    state = await fetchPaymentProcessor(paymentProcessorPubkey);
    expect(state.paused).to.be.false;

    console.log('Payment processor resumed');

    await program.methods.pay(new anchor.BN(50_000), new anchor.BN(123)).accounts({
      payer: payerKeypair.publicKey,
      payerTokenAccount: payerTokenAccount,
      receiverTokenAccount: receiverTokenAccount,
      paymentProcessor: paymentProcessorPubkey,
    }).signers([payerKeypair]).rpc();

    console.log('Payment succeeded after resuming');
  })

});
