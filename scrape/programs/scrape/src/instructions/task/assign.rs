use crate::state::provider_node::ProviderNode;
use crate::state::task::{Task, /*TaskStatus*/};
use anchor_lang::prelude::*;
//use crate::errors::*;

#[derive(Accounts)]
pub struct AssignTaskContext<'info> {
    #[account(
        mut,
        seeds = [Task::PREFIX.as_bytes(), task.owner.as_ref(), task.id.to_le_bytes().as_ref()],
        bump
    )]
    pub task: Box<Account<'info, Task>>,
    #[account(
        seeds = [ProviderNode::PREFIX.as_bytes(), node.owner.as_ref()],
        bump
    )]
    pub node: Box<Account<'info, ProviderNode>>,
    pub signer: Signer<'info>,
}

#[inline(never)]
pub fn assign(ctx: Context<AssignTaskContext>) -> Result<()> {
    let task = &mut ctx.accounts.task;
    let node = &ctx.accounts.node;

    // Verify task is in Pending state
    //require!(task.status == TaskStatus::Pending, ErrorCode::TaskNotAssigned);

    // Verify node is active
    //require!(node.active, ErrorCode::InactiveNode);

    // Assign task to node
    task.node_assigned = Some(node.owner);
    //task.status = TaskStatus::Assigned;

    msg!("Task {} assigned to node: {}", task.id, node.owner);
    Ok(())
}