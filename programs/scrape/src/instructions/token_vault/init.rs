use crate::state::token::TokenVault;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct InitializeTokenVaultContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = TokenVault::SIZE,
        seeds = [TokenVault::PREFIX.as_bytes()],
        bump
    )]
    pub token_vault: Box<Account<'info, TokenVault>>,
    #[account(
        constraint = vault_token_account.mint == crate::SCRAPE_MINT.parse::<Pubkey>().unwrap(),
        constraint = vault_token_account.owner == token_vault.key(),
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}


pub fn init(ctx: Context<InitializeTokenVaultContext>) -> Result<()> {
    let signer = &ctx.accounts.signer;
    let token_vault = &mut ctx.accounts.token_vault;
    let vault_token_account = &ctx.accounts.vault_token_account;

    token_vault.bump = ctx.bumps.token_vault;
    token_vault.owner = signer.key(); // Set the owner to the signer (can be changed to Pubkey::default() if no admin is needed)
    token_vault.token_account = vault_token_account.key();
    token_vault.total_rewards_distributed = 0;
    token_vault.bandwidth_paid = 0;
    token_vault.bandwidth_used = 0;

    msg!("Token vault initialized: {}", token_vault.key());
    Ok(())
}