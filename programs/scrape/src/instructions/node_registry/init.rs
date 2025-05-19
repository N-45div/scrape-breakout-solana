use anchor_lang::prelude::*;
use crate::state::node_registry::NodeRegistry;

#[derive(Accounts)]
pub struct NodeRegistryInitializeContext<'info> {
    #[account(
        init,
        payer = signer,
        space = NodeRegistry::calculate_size(0), // Start with space for 0 nodes
        seeds = [NodeRegistry::PREFIX.as_bytes()],
        bump
    )]
    pub node_registry: Account<'info, NodeRegistry>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn noderegistryinitialize(ctx: Context<NodeRegistryInitializeContext>) -> Result<()> {
    let node_registry = &mut ctx.accounts.node_registry;
    node_registry.bump = ctx.bumps.node_registry;
    node_registry.nodes = Vec::new();
    Ok(())
}