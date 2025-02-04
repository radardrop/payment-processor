use anchor_lang::prelude::*;
use anchor_lang::ToAccountInfo;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("6k7LvmC8cisSMeNz6xK3Lw81rMfPKrjLn5uBNNUMiJE5");

#[program]
pub mod payment_processor {
    use super::*;

    /// Initialize a brand new PaymentProcessor account on-chain.
    /// - `receiver` is the Pubkey that will receive the SPL Tokens.
    /// - `mint` is the SPL Token minter.
    pub fn initialize(ctx: Context<Initialize>, receiver: Pubkey, mint: Pubkey) -> Result<()> {
        let payment_processor = &mut ctx.accounts.payment_processor;
        payment_processor.owner = ctx.accounts.payer.key();
        payment_processor.receiver = receiver;
        payment_processor.mint = mint;
        payment_processor.paused = false;
        Ok(())
    }

    /// Update the SPL tokens receiver.
    pub fn set_receiver(ctx: Context<SetReceiver>, new_receiver: Pubkey) -> Result<()> {
        let payment_processor = &mut ctx.accounts.payment_processor;
        payment_processor.receiver = new_receiver;
        msg!("Receiver updated to {}", new_receiver);
        Ok(())
    }

    /// Pause the Payments.
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        let payment_processor = &mut ctx.accounts.payment_processor;
        payment_processor.paused = true;
        msg!("PaymentProcessor paused");
        Ok(())
    }

    /// Unpause the Payments.
    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        let payment_processor = &mut ctx.accounts.payment_processor;
        payment_processor.paused = false;
        msg!("PaymentProcessor unpaused");
        Ok(())
    }

    /// Transfers `amount` of SPL tokens from the payer to the receiver.
    ///
    /// # Parameters
    ///
    /// - `amount`: The number of tokens to transfer, specified in the smallest denomination.
    ///             For example, if the token has 6 decimals, 1 token is represented as 1_000_000.
    /// - `payment_id`: A unique identifier for the payment.
    pub fn pay(ctx: Context<Pay>, amount: u64, payment_id: u64) -> Result<()> {
        let payment_processor = &ctx.accounts.payment_processor;

        // Check the mint.
        if payment_processor.mint != ctx.accounts.payer_token_account.mint {
            return err!(PaymentProcessorError::InvalidMint);
        }

        // Check the mint of the receiver's token account.
        if payment_processor.mint != ctx.accounts.receiver_token_account.mint {
            return err!(PaymentProcessorError::ReceiverTokenMintMismatch);
        }

        // Check if paused.
        if payment_processor.paused {
            return err!(PaymentProcessorError::PaymentProcessorPaused);
        }

        token::transfer(ctx.accounts.transfer_ctx().with_signer(&[]), amount)?;

        let clock = Clock::get()?;
        emit!(PaymentDone {
            payer: ctx.accounts.payer.key(),
            amount,
            payment_id,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }
}

/// PaymentProcessor Account - Owned by an admin to update the program settings.
#[account]
pub struct PaymentProcessor {
    pub owner: Pubkey,
    /// The public key that will receive the SPL tokens.
    pub receiver: Pubkey,
    /// The SPL token mint Pubkey to verify the token sent.
    pub mint: Pubkey,
    /// If true, payments are paused and nobody can pay through the program.
    pub paused: bool,
}

/// Discriminator (8 bytes) + owner (32) + receiver (32) + mint (32) + paused (1) = 105 bytes
impl PaymentProcessor {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 1;
}

#[derive(Accounts)]
#[instruction(receiver: Pubkey)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [b"payment_processor"],
        space = PaymentProcessor::SIZE,
        bump
    )]
    pub payment_processor: Account<'info, PaymentProcessor>,

    /// The perso who creates (and owns) the PaymentProcessor account.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System Program for creating new accounts on Solana.
    pub system_program: Program<'info, System>,
}

/// Context for changing the receiver address.
#[derive(Accounts)]
pub struct SetReceiver<'info> {
    // Anchor ensures the 'owner' field matches 'owner' signer below.
    #[account(mut, has_one = owner)]
    pub payment_processor: Account<'info, PaymentProcessor>,

    /// CHECK: This account is the verified owner of the PaymentProcessor account.
    /// Its safety is guaranteed by the `has_one` constraint above.
    #[account(signer)]
    pub owner: AccountInfo<'info>,
}

/// Context for pausing the PaymentProcessor.
#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(mut, has_one = owner)]
    pub payment_processor: Account<'info, PaymentProcessor>,

    /// CHECK: This account is the verified owner of the PaymentProcessor account.
    /// Its safety is guaranteed by the `has_one` constraint above.
    #[account(signer)]
    pub owner: AccountInfo<'info>,
}

/// Context for unpausing the PaymentProcessor.
#[derive(Accounts)]
pub struct Unpause<'info> {
    #[account(mut, has_one = owner)]
    pub payment_processor: Account<'info, PaymentProcessor>,

    /// CHECK: This account is the verified owner of the PaymentProcessor account.
    /// Its safety is guaranteed by the `has_one` constraint above.
    #[account(signer)]
    pub owner: AccountInfo<'info>,
}

/// Context for the pay operation.
#[derive(Accounts)]
pub struct Pay<'info> {
    /// The user paying tokens.
    #[account(mut)]
    pub payer: Signer<'info>,

    /// The token account of the payer (from which tokens will be deducted).
    #[account(mut)]
    pub payer_token_account: Account<'info, TokenAccount>,

    /// The token account of the receiver (which will receive the tokens).
    #[account(
        mut,
        // Enforce that the token account's owner is the designated receiver.
        constraint = receiver_token_account.owner == receiver.key()
    )]
    pub receiver_token_account: Account<'info, TokenAccount>,

    /// PaymentProcessor must match the receiver field with `receiver_token_account.owner`
    #[account(mut, has_one = receiver)]
    pub payment_processor: Account<'info, PaymentProcessor>,

    /// The expected receiver of tokens
    pub receiver: SystemAccount<'info>,

    /// Token derived address of the SPL Token program.
    pub token_program: Program<'info, Token>,
}

impl<'info> Pay<'info> {
    /// Helper to construct the Transfer CPI context.
    fn transfer_ctx(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.payer_token_account.to_account_info(),
                to: self.receiver_token_account.to_account_info(),
                authority: self.payer.to_account_info(),
            },
        )
    }
}

/// PaymentDone event - to be listened off-chain.
#[event]
pub struct PaymentDone {
    #[index]
    pub payer: Pubkey,
    pub amount: u64,
    pub payment_id: u64,
    pub timestamp: i64,
}

/// Custom errors
#[error_code]
pub enum PaymentProcessorError {
    #[msg("PaymentProcessor is paused")]
    PaymentProcessorPaused,
    #[msg("The mint of the provided token account does not match the PaymentProcessor")]
    InvalidMint,
    #[msg("The receiver token account mint does not match the PaymentProcessor mint")]
    ReceiverTokenMintMismatch,
}
