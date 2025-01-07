# Payment Processor

This Solana program is built using **Anchor**, a framework for developing Solana programs. The project implements a **payment processor** that facilitates secure payments using SPL tokens.

---

## Main Features

- **Initialize a Payment Processor**
    - Creates a payment processor associated with an owner, a recipient account, and a specific SPL token mint.
- **Payment Processing**
    - Enables users to transfer SPL tokens following predefined rules.
- **Flexible Management**
    - Features to **pause** and **resume** the payment processor.
    - Allows changing the recipient address for payments.
- **Security Checks**
    - Prevents payments while the processor is paused or if an invalid token mint is provided.

---

## Prerequisites

1. **Install Anchor and Solana CLI**:
    - [Anchor Documentation](https://www.anchor-lang.com/)
    - [Solana CLI Documentation](https://docs.solana.com/cli/install-solana-cli-tools)
2. **Node.js and Yarn**:
    - Required for managing TypeScript scripts.

---

## Installation and Usage

### Clone the Project

```shell script
git clone git@github.com:radardrop/payment-processor.git
cd payment-processor
```

### Install TypeScript Dependencies

```shell script
yarn install
```

### Compile the Anchor Program

```shell script
anchor build
```

### Deploy the Program to Localnet

```shell script
anchor deploy
```

Make sure the `Localnet` cluster is configured.

### Run Tests

The test scripts simulate interactions with the Solana program using **Mocha** and **Chai**.

Run the tests using:

```shell script
anchor test
```

---

## Test Details

The tests cover:

1. **Successful Initialization**:
    - Creates a payment processor with an owner, an SPL token mint, and a recipient.
2. **Token Minting and Account Setup**:
    - Mints SPL tokens for the payer and configures associated accounts.
3. **Payment Execution**:
    - Processes a payment and verifies payer and recipient token balances.
4. **Invalid Payment Cases**:
    - Tests failed payment attempts with an invalid token mint.
5. **Recipient Management**:
    - Updates the recipient address.
6. **Pause and Resume**:
    - Ensures payments fail when the processor is paused and succeed after resuming.

---

## Resources

- **Anchor Documentation**: [https://www.anchor-lang.com/](https://www.anchor-lang.com/)
- **Solana Documentation**: [https://docs.solana.com/](https://docs.solana.com/)

---

## Contributing

Pull requests and suggestions are welcome. For major changes, please open an issue to start a discussion.