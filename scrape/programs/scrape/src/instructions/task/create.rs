use crate::state::client::Client;
use crate::state::endpoint_node::EndpointNode;
use crate::state::task::{Task, TaskStatus};
use crate::state::token::TokenVault;
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct CreateTaskContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = Task::SIZE,
        seeds = [Task::PREFIX.as_bytes(), signer.key().as_ref(), client.task_counter.to_le_bytes().as_ref()],
        bump
    )]
    pub task: Box<Account<'info, Task>>,
    #[account(
        mut,
        seeds = [Client::PREFIX.as_bytes(), signer.key().as_ref()],
        bump
    )]
    pub client: Box<Account<'info, Client>>,
    #[account(
        seeds = [EndpointNode::PREFIX.as_bytes(), endpoint_node.owner.as_ref()],
        bump
    )]
    pub endpoint_node: Box<Account<'info, EndpointNode>>,
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
        constraint = user_token_account.mint == crate::SCRAPE_MINT.parse::<Pubkey>().unwrap(),
        constraint = user_token_account.owner == signer.key(),
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[inline(never)]
pub fn create(
    ctx: Context<CreateTaskContext>,
    url: String,
    filter: String,
    label: String,
    format: String,
    reward: u64,
) -> Result<()> {
    let signer = &ctx.accounts.signer;
    let client = &mut ctx.accounts.client;
    let task = &mut ctx.accounts.task;
    let endpoint_node = &ctx.accounts.endpoint_node;
    let token_vault = &ctx.accounts.token_vault;

    // Transfer reward tokens to the vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: signer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_spl::token::transfer(cpi_ctx, reward)?;

    // Increment task counter in client
    let task_id = client.task_counter;
    client.task_counter += 1;

    // Initialize task
    task.bump = ctx.bumps.task;
    task.id = task_id;
    task.owner = signer.key();
    task.endpoint_node = endpoint_node.key();
    task.url = url;
    task.filter = filter;
    task.label = label;
    task.format = format;
    task.reward = reward;
    task.status = TaskStatus::Pending;
    task.node_assigned = None;
    task.ipfs_hash = None;
    task.dataset_size = 0;

    // Update token vault
    token_vault.bandwidth_paid += reward;

    msg!("Task created: ID {}, URL: {}", task.id, task.url);
    Ok(())
}