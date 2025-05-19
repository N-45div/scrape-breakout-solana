use crate::state::endpoint_node::EndpointNode;
use anchor_lang::prelude::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct CloseEndpointNodeContext<'info> {
    #[account(
        mut,
        close = signer,
        seeds = [EndpointNode::PREFIX.as_bytes(), signer.key().as_ref()],
        bump
    )]
    pub endpoint_node: Box<Account<'info, EndpointNode>>,
    #[account(mut)]
    pub signer: Signer<'info>,
}

#[inline(never)]
pub fn close(ctx: Context<CloseEndpointNodeContext>) -> Result<()> {
    let endpoint_node = &ctx.accounts.endpoint_node;
    let signer = &ctx.accounts.signer;

    // Verify the signer is the owner of the EndpointNode
    require!(endpoint_node.owner == signer.key(), ErrorCode::UnauthorizedNode);

    msg!("EndpointNode closed: {}", endpoint_node.key());
    Ok(())
}