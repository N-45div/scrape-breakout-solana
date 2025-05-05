use crate::state::provider_node::ProviderNode;
use anchor_lang::prelude::*;
//use crate::errors::*;

#[derive(Accounts)]
pub struct UpdateProviderNodeReportContext<'info> {
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
pub fn update_report(
    ctx: Context<UpdateProviderNodeReportContext>,
    bandwidth_used: u64,
    reputation_increase: u64,
) -> Result<()> {
    let provider_node = &mut ctx.accounts.provider_node;
    let signer = &ctx.accounts.signer;

    // Update usage and reputation
    provider_node.bandwidth_used += bandwidth_used;
    provider_node.reputation += reputation_increase;

    msg!(
        "ProviderNode report updated: {}. Bandwidth Used: {} MB, Reputation: {}",
        provider_node.key(),
        provider_node.bandwidth_used,
        provider_node.reputation
    );
    Ok(())
}