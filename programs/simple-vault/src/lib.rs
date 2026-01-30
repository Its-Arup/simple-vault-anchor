use anchor_lang::{prelude::*, system_program};
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("AdEUyEPiUi6FmHKP8oPRRjehD8KRUZTppH22QkGWUHCu");


#[program]
pub mod simple_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.vault.signer = ctx.accounts.payer.key();
        ctx.accounts.vault.bump = ctx.bumps.vault_wallet;
        Ok(())
    }

    pub fn add_funds(ctx: Context<AddFunds>, amount: u64) -> Result<()> {
        let vault_wallet = &mut ctx.accounts.vault_wallet;
        let signer = &ctx.accounts.signer;

        // Transfer funds from signer to vault
        let cpi_accounts = Transfer {
            from: signer.to_account_info(),
            to: vault_wallet.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        transfer(cpi_ctx, amount)?;

        Ok(())
    }

    pub fn withdraw_funds(ctx: Context<WithdrawFunds>, amount: u64) -> Result<()> {
        let vault_wallet = &mut ctx.accounts.vault_wallet;

        let signer = &ctx.accounts.signer;
        let bump = ctx.accounts.vault.bump;

        let signer_seeds: &[&[&[u8]]] = &[&[
            b"pda",
            signer.key.as_ref(),
            &[bump],
        ]];
        
        // Ensure vault has enough funds
        require!(vault_wallet.to_account_info().lamports() >= amount, ErrorCode::Overflow);

        // Transfer funds from vault to signer
        let cpi_accounts = Transfer {
            from: vault_wallet.to_account_info(),
            to: signer.to_account_info(),
        };
        let cpi_program = ctx.accounts.system_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts).with_signer(signer_seeds);
        transfer(cpi_ctx, amount)?;


        Ok(())
    }

}

#[error_code]
pub enum ErrorCode {
    #[msg("Overflow occurred")]
    Overflow,
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub bump: u8,
    pub signer: Pubkey,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    payer: Signer<'info>,
    #[account(init, payer = payer, space = 8 + Vault::INIT_SPACE, seeds = [b"vault", payer.key().as_ref()], bump)]
    vault: Account<'info, Vault>,
    #[account(init ,payer= payer, space = 0, seeds = [b"pda", payer.key().as_ref()], bump , owner = system_program::ID)]
    /// CHECK:This account will hold sol
    vault_wallet : UncheckedAccount<'info>,
    system_program: Program<'info, anchor_lang::prelude::System>,
}

#[derive(Accounts)]
pub struct AddFunds<'info> {
    pub signer: Signer<'info>,
    #[account(mut, seeds = [b"vault", signer.key().as_ref()], bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"pda", signer.key().as_ref()], bump)]
    pub vault_wallet : SystemAccount<'info>,
    pub system_program: Program<'info, anchor_lang::prelude::System>,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    #[account(mut)]
    signer: Signer<'info>,
    #[account(seeds = [b"vault", signer.key().as_ref()], bump)]
    vault: Account<'info, Vault>,
    #[account(mut, seeds = [b"pda", signer.key().as_ref()], bump )]
    pub vault_wallet : SystemAccount<'info>,
    pub system_program: Program<'info, anchor_lang::prelude::System>,
}


