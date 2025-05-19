use crate::state::provider_node::ProviderNode;
use crate::state::token::TokenVault;
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct ClaimTaskRewardsContext<'info> {
    #[account(
        mut,
        seeds = [ProviderNode::PREFIX.as_bytes(), node.owner.as_ref()],
        bump
    )]
    pub node: Box<Account<'info, ProviderNode>>,
    #[account(
        mut,
        seeds = [TokenVault::PREFIX.as_bytes()],
        bump
    )]
    pub token_vault: Box<Account<'info, TokenVault>>,
    #[account(
        mut,
        constraint = vault_token_account.mint == crate::SCRAPE_MINT.parse::<Pubkey>().unwrap(),
        constraint = vault_token_account.owner == token_vault.key(),
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        constraint = node_token_account.mint == crate::SCRAPE_MINT.parse::<Pubkey>().unwrap(),
        constraint = node_token_account.owner == node.owner,
    )]
    pub node_token_account: Box<Account<'info, TokenAccount>>,
    pub signer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[inline(never)]
pub fn rewards(ctx: Context<ClaimTaskRewardsContext>) -> Result<()> {
    let node = &mut ctx.accounts.node;
    let token_vault = &mut ctx.accounts.token_vault;

    // Verify the signer is the owner of the node
    require!(node.owner == ctx.accounts.signer.key(), ErrorCode::UnauthorizedNode);

    // Check if node is eligible for bonus rewards
    require!(
        node.reputation >= crate::REPUTATION_THRESHOLD,
        ErrorCode::InsufficientReputation
    );

    // Calculate bonus rewards (e.g., BONUS_RATE * number of thresholds crossed)
    let bonus_rewards = crate::BONUS_RATE * (node.reputation / crate::REPUTATION_THRESHOLD);
    let bonus_rewards = bonus_rewards.saturating_sub(node.rewards); // Only claim unclaimed rewards

    // Transfer bonus rewards
    if bonus_rewards > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.node_token_account.to_account_info(),
            authority: token_vault.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, bonus_rewards)?;

        // Update node and token vault
        node.rewards += bonus_rewards;
        node.last_bonus_claim = Clock::get()?.unix_timestamp as u64;
        token_vault.total_rewards_distributed += bonus_rewards;
    }

    msg!(
        "Rewards claimed for node: {}. Total Rewards: {}",
        node.owner,
        node.rewards
    );
    Ok(())
}