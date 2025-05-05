use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};


pub mod error;
pub mod instructions;
pub mod state;

use error::*;
use state;
use instructions::{token_vault, endpoint_node, provider_node, task, client , dataset};

// Constants for the program
pub const SCRAPE_MINT: &str = "YourScrapeMintAddressHere"; // Replace with actual $SCRAPE mint address
pub const BONUS_RATE: u64 = 100; // Bonus reward rate (100 $SCRAPE per reputation threshold)
pub const REPUTATION_THRESHOLD: u64 = 50;


declare_id!("DKo9acezHZRQs8cZTkmzaoMC9MjUDKXeexYMdUNgTqyz");

#[program]
pub mod scraping_hub {
    use super::*;

    // Token Vault Instructions
    pub fn init_token_vault(ctx: Context<token_vault::InitializeTokenVaultContext>) -> Result<()> {
        token_vault::init::handler(ctx)
    }

    // Client Instructions
    pub fn create_client(ctx: Context<client::CreateClientContext>) -> Result<()> {
        client::create::handler(ctx)
    }

    pub fn update_client_report(ctx: Context<client::UpdateClientReportContext>) -> Result<()> {
        client::update_report::handler(ctx)
    }

    // Endpoint Node Instructions
    pub fn create_endpoint_node(ctx: Context<endpoint_node::CreateEndpointNodeContext>) -> Result<()> {
        endpoint_node::create::handler(ctx)
    }

    pub fn close_endpoint_node(ctx: Context<endpoint_node::CloseEndpointNodeContext>) -> Result<()> {
        endpoint_node::close::handler(ctx)
    }

    // Provider Node Instructions
    pub fn create_node(
        ctx: Context<provider_node::CreateProviderNodeContext>,
        ipv4: [u8; 4],
        proxy_port: u16,
        client_port: u16,
        bandwidth_limit: u64,
    ) -> Result<()> {
        provider_node::create::handler(ctx, ipv4, proxy_port, client_port, bandwidth_limit)
    }

    pub fn update_node(
        ctx: Context<provider_node::UpdateProviderNodeContext>,
        ipv4: [u8; 4],
        proxy_port: u16,
        client_port: u16,
        bandwidth_limit: u64,
    ) -> Result<()> {
        provider_node::update::handler(ctx, ipv4, proxy_port, client_port, bandwidth_limit)
    }

    pub fn update_node_report(
        ctx: Context<provider_node::UpdateProviderNodeReportContext>,
        bandwidth_used: u64,
        reputation_increase: u64,
    ) -> Result<()> {
        provider_node::update_report::handler(ctx, bandwidth_used, reputation_increase)
    }

    // Task Instructions
    pub fn create_task(
        ctx: Context<task::CreateTaskContext>,
        url: String,
        filter: String,
        label: String,
        format: String,
        reward: u64,
    ) -> Result<()> {
        task::create::handler(ctx, url, filter, label, format, reward)
    }

    pub fn assign_task(ctx: Context<task::AssignTaskContext>) -> Result<()> {
        task::assign::handler(ctx)
    }

    pub fn complete_task(ctx: Context<task::CompleteTaskContext>, ipfs_hash: String) -> Result<()> {
        task::complete::handler(ctx, ipfs_hash)
    }

    pub fn claim_task_rewards(ctx: Context<task::ClaimTaskRewardsContext>) -> Result<()> {
        task::rewards::handler(ctx)
    }

    // Dataset Instructions
    pub fn download_dataset(ctx: Context<dataset::DownloadDataset>) -> Result<()> {
        dataset::download::handler(ctx)
    }

    pub fn preview_dataset(ctx: Context<dataset::PreviewDataset>) -> Result<()> {
        dataset::preview::handler(ctx)
    }
}