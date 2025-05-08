use crate::state::client::Client;
use crate::state::task::{Task, TaskStatus};
use anchor_lang::prelude::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct DownloadDatasetContext<'info> {
    #[account(
        seeds = [Task::PREFIX.as_bytes(), task.owner.as_ref(), task.id.to_le_bytes().as_ref()],
        bump
    )]
    pub task: Box<Account<'info, Task>>,
    #[account(
        seeds = [Client::PREFIX.as_bytes(), signer.key().as_ref()],
        bump
    )]
    pub client: Box<Account<'info, Client>>,
    pub signer: Signer<'info>,
}

#[inline(never)]
pub fn download(ctx: Context<DownloadDatasetContext>) -> Result<()> {
    let task = &ctx.accounts.task;
    let client = &ctx.accounts.client;
    let signer = &ctx.accounts.signer;

    // Verify the task is completed
    require!(task.status == TaskStatus::Completed, ErrorCode::TaskNotAssigned);

    // Verify the signer is the client who owns the task
    require!(task.owner == signer.key(), ErrorCode::UnauthorizedNode);
    require!(task.owner == client.owner, ErrorCode::UnauthorizedNode);

    // Verify the dataset is available (IPFS hash exists)
    require!(task.ipfs_hash.is_some(), ErrorCode::TaskNotAssigned);

    // Pricing logic (same as your previous implementation)
    const FREE_THRESHOLD: u64 = 500; // 500 MB
    const RATE_PER_MB_LAMPORTS: u64 = 5_000_000; // 0.005 SOL per MB = 5,000,000 lamports

    let dataset_size = task.dataset_size;
    let cost_lamports = if dataset_size <= FREE_THRESHOLD {
        0
    } else {
        (dataset_size - FREE_THRESHOLD) * RATE_PER_MB_LAMPORTS
    };

    // In a real implementation, you might transfer lamports to a FeeReceiver here
    // For now, we log the cost and assume the client handles the actual download off-chain
    msg!(
        "Dataset download initiated for task {}. IPFS Hash: {}. Size: {} MB. Cost: {} lamports.",
        task.id,
        task.ipfs_hash.as_ref().unwrap(),
        dataset_size,
        cost_lamports
    );

    Ok(())
}