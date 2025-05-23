use crate::state::{provider_node::ProviderNode, node_registry::NodeRegistry};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct CreateProviderNodeContext<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        space = ProviderNode::SIZE,
        seeds = [ProviderNode::PREFIX.as_bytes(), signer.key().as_ref()],
        bump
    )]
    pub provider_node: Box<Account<'info, ProviderNode>>,
    #[account(
        mut,
        seeds = [NodeRegistry::PREFIX.as_bytes()],
        bump = node_registry.bump,
        realloc = NodeRegistry::calculate_size(node_registry.nodes.len() + 1),
        realloc::payer = signer,
        realloc::zero = false
    )]
    pub node_registry: Box<Account<'info, NodeRegistry>>,
    #[account(
        constraint = node_token_account.mint == crate::SCRAPE_MINT.parse::<Pubkey>().unwrap(),
        constraint = node_token_account.owner == signer.key(),
    )]
    pub node_token_account: Box<Account<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[inline(never)]
pub fn create(
    ctx: Context<CreateProviderNodeContext>,
    ipv4: [u8; 4],
    proxy_port: u16,
    client_port: u16,
    bandwidth_limit: u64,
) -> Result<()> {
    let signer = &ctx.accounts.signer;
    let provider_node = &mut ctx.accounts.provider_node;
    let node_token_account = &ctx.accounts.node_token_account;
    let node_registry = &mut ctx.accounts.node_registry;

    // Initialize the ProviderNode
    provider_node.bump = ctx.bumps.provider_node;
    provider_node.owner = signer.key();
    provider_node.ipv4 = ipv4;
    provider_node.proxy_port = proxy_port;
    provider_node.client_port = client_port;
    provider_node.bandwidth_limit = bandwidth_limit;
    provider_node.bandwidth_used = 0;
    provider_node.reputation = 0;
    provider_node.rewards = 0;
    provider_node.active = true;
    provider_node.token_account = node_token_account.key();
    provider_node.last_bonus_claim = 0;

    // Add the provider node's owner to the NodeRegistry
    if !node_registry.nodes.contains(&provider_node.owner) {
        node_registry.nodes.push(provider_node.owner);
    }

    msg!("ProviderNode created for user: {}", provider_node.owner);
    msg!("ProviderNode added to NodeRegistry. Total nodes: {}", node_registry.nodes.len());

    Ok(())
}