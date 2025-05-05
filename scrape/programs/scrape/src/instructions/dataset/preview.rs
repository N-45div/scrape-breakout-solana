use crate::state::client::Client;
use crate::state::task::{Task, TaskStatus};
use anchor_lang::prelude::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct PreviewDatasetContext<'info> {
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
pub fn preview(ctx: Context<PreviewDatasetContext>) -> Result<()> {
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

    // Log the preview action (actual preview would happen off-chain)
    msg!(
        "Dataset preview initiated for task {}. IPFS Hash: {}. Size: {} MB.",
        task.id,
        task.ipfs_hash.as_ref().unwrap(),
        task.dataset_size
    );

    Ok(())
}