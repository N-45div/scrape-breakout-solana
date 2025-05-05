use crate::state::provider_node::ProviderNode;
use crate::state::task::{Task, /*TaskStatus*/};
use crate::state::token::TokenVault;
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct CompleteTaskContext<'info> {
    #[account(
        mut,
        seeds = [Task::PREFIX.as_bytes(), task.owner.as_ref(), task.id.to_le_bytes().as_ref()],
        bump
    )]
    pub task: Box<Account<'info, Task>>,
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
pub fn complete(ctx: Context<CompleteTaskContext>, ipfs_hash: String) -> Result<()> {
    let task = &mut ctx.accounts.task;
    let node = &mut ctx.accounts.node;
    let token_vault = &mut ctx.accounts.token_vault;

    // Verify task is in Assigned state
    require!(task.status == TaskStatus::Assigned, ErrorCode::TaskNotAssigned);

    // Verify node is the assigned node
    require!(task.node_assigned == Some(node.owner), ErrorCode::UnauthorizedNode);

    // Update task
    task.status = TaskStatus::Completed;
    task.ipfs_hash = Some(ipfs_hash.clone());
    task.dataset_size = 1; // Placeholder: 1 MB (update with actual size in practice)

    // Update node usage and reputation
    node.bandwidth_used += task.dataset_size;
    node.reputation += 10; // Increment reputation by 10 for completing a task

    // Distribute rewards
    let reward = task.reward;
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.node_token_account.to_account_info(),
        authority: token_vault.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::transfer(cpi_ctx, reward)?;

    // Update token vault
    token_vault.total_rewards_distributed += reward;
    token_vault.bandwidth_used += task.dataset_size;

    msg!(
        "Task {} completed via proxy (IP: {:?}, Port: {}). IPFS Hash: {}. $SCRAPE Rewards: {} to node: {}. Reputation: {}",
        task.id,
        node.ipv4,
        node.proxy_port,
        ipfs_hash,
        reward,
        node.owner,
        node.reputation
    );
    Ok(())
}