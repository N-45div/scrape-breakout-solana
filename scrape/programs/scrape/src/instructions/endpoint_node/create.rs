use crate::state::endpoint_node::EndpointNode;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateEndpointNodeContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = EndpointNode::SIZE,
        seeds = [EndpointNode::PREFIX.as_bytes(), signer.key().as_ref()],
        bump
    )]
    pub endpoint_node: Box<Account<'info, EndpointNode>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[inline(never)]
pub fn create(ctx: Context<CreateEndpointNodeContext>) -> Result<()> {
    let signer = &ctx.accounts.signer;
    let endpoint_node = &mut ctx.accounts.endpoint_node;

    endpoint_node.bump = ctx.bumps.endpoint_node;
    endpoint_node.owner = signer.key();

    msg!("EndpointNode created for user: {}", endpoint_node.owner);
    Ok(())
}