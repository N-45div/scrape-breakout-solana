use crate::state::provider_node::ProviderNode;
use anchor_lang::prelude::*;
//use crate::errors::*;

#[derive(Accounts)]
pub struct UpdateProviderNodeContext<'info> {
    #[account(
        mut,
        seeds = [ProviderNode::PREFIX.as_bytes(), signer.key().as_ref()],
        bump
    )]
    pub provider_node: Box<Account<'info, ProviderNode>>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[inline(never)]
pub fn update(
    ctx: Context<UpdateProviderNodeContext>,
    ipv4: [u8; 4],
    proxy_port: u16,
    client_port: u16,
    bandwidth_limit: u64,
) -> Result<()> {
    let provider_node = &mut ctx.accounts.provider_node;
    let signer = &ctx.accounts.signer;

    // Verify the signer is the owner of the ProviderNode
    //require!(provider_node.owner == signer.key(), ErrorCode::UnauthorizedNode);

    // Update fields
    provider_node.ipv4 = ipv4;
    provider_node.proxy_port = proxy_port;
    provider_node.client_port = client_port;
    provider_node.bandwidth_limit = bandwidth_limit;

    msg!("ProviderNode updated: {}", provider_node.key());
    Ok(())
}