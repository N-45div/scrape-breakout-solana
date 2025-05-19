use crate::error::ErrorCode;
use crate::state::endpoint_node::EndpointNode;
use crate::state::{provider_node::ProviderNode, task::{Task, TaskStatus}, node_registry::NodeRegistry};
use anchor_lang::prelude::*;

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
    require!(
        task.status == TaskStatus::Pending,
        ErrorCode::TaskNotAssigned
    );

    // Verify node is active
    require!(node.active, ErrorCode::InactiveNode);

    // Assign task to node
    task.node_assigned = Some(node.owner);
    task.status = TaskStatus::Assigned;

    msg!("Task {} assigned to node: {}", task.id, node.owner);
    Ok(())
}

#[derive(Accounts)]
pub struct AssignTaskByEndpointContext<'info> {
    #[account(
        mut,
        seeds = [Task::PREFIX.as_bytes(), task.owner.as_ref(), task.id.to_le_bytes().as_ref()],
        bump,
        has_one = endpoint_node @ ErrorCode::UnauthorizedNode,
        constraint = task.status == TaskStatus::Pending @ ErrorCode::TaskNotAssigned
    )]
    pub task: Box<Account<'info, Task>>,
    #[account(
        seeds = [b"ENDPOINT_NODE", endpoint_node.owner.as_ref()],
        bump,
        constraint = endpoint_node.owner == signer.key() @ ErrorCode::UnauthorizedNode
    )]
    pub endpoint_node: Box<Account<'info, EndpointNode>>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        seeds = [NodeRegistry::PREFIX.as_bytes()],
        bump
    )]
    pub node_registry: Box<Account<'info, NodeRegistry>>,
    #[account(
        seeds = [ProviderNode::PREFIX.as_bytes(), provider_node.owner.as_ref()],
        bump,
        constraint = provider_node.active @ ErrorCode::InactiveNode
    )]
    pub provider_node: Box<Account<'info, ProviderNode>>,
}

pub fn assign_task_by_endpoint(ctx: Context<AssignTaskByEndpointContext>) -> Result<()> {
    let task = &mut ctx.accounts.task;
    let provider_node = &ctx.accounts.provider_node;

    // Assign the task to the provider node
    task.node_assigned = Some(provider_node.owner);
    task.status = TaskStatus::Assigned;

    msg!("Task {} assigned to provider node: {} by endpoint node: {}", 
        task.id, provider_node.owner, ctx.accounts.endpoint_node.key());
    Ok(())
}