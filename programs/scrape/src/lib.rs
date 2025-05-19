#![allow(unexpected_cfgs)]
#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

pub mod error;
pub mod instructions;
pub mod state;

// Import error and instruction modules explicitly
pub use error::ErrorCode;
pub use instructions::*;

// Constants for the program
pub const SCRAPE_MINT: &str = "6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3"; // This is the test mint address for POC
pub const BONUS_RATE: u64 = 100; // Bonus reward rate
pub const REPUTATION_THRESHOLD: u64 = 50;

declare_id!("7pqme6UtiQshBaes6hQ2HkEwnwUph1JsEujZzKi9rmxU");

#[program]
pub mod scrape {
    use super::*;

    // Token Vault Instructions
    pub fn init_token_vault(ctx: Context<InitializeTokenVaultContext>) -> Result<()> {
        token_vault::init(ctx)?;
        Ok(())
    }

    // Client Instructions
    pub fn create_client(ctx: Context<CreateClientContext>) -> Result<()> {
        client::create(ctx);
        Ok(())
    }

    pub fn update_client_report(ctx: Context<UpdateClientReportContext>) -> Result<()> {
        client::update_report(ctx)?;
        Ok(())
    }

    // Endpoint Node Instructions
    pub fn create_endpoint_node(ctx: Context<CreateEndpointNodeContext>) -> Result<()> {
        endpoint_node::create(ctx)?;
        Ok(())
    }

    pub fn close_endpoint_node(ctx: Context<CloseEndpointNodeContext>) -> Result<()> {
        endpoint_node::close(ctx)?;
        Ok(())
    }

    // Provider Node Instructions
    pub fn create_node(
        ctx: Context<CreateProviderNodeContext>,
        ipv4: [u8; 4],
        proxy_port: u16,
        client_port: u16,
        bandwidth_limit: u64,
    ) -> Result<()> {
        provider_node::create(ctx, ipv4, proxy_port, client_port, bandwidth_limit)
    }

    pub fn node_registry_initialize(ctx: Context<NodeRegistryInitializeContext>) -> Result<()> {
        node_registry::noderegistryinitialize(ctx)
    }

    pub fn update_node(
        ctx: Context<UpdateProviderNodeContext>,
        ipv4: [u8; 4],
        proxy_port: u16,
        client_port: u16,
        bandwidth_limit: u64,
    ) -> Result<()> {
        provider_node::update(ctx, ipv4, proxy_port, client_port, bandwidth_limit)
    }

    pub fn update_node_report(
        ctx: Context<UpdateProviderNodeReportContext>,
        bandwidth_used: u64,
        reputation_increase: u64,
    ) -> Result<()> {
        provider_node::update_report(ctx, bandwidth_used, reputation_increase)
    }

    // Task Instructions
    pub fn create_task(
        ctx: Context<CreateTaskContext>,
        url: String,
        filter: String,
        label: String,
        format: String,
        reward: u64,
    ) -> Result<()> {
        task::create(ctx, url, filter, label, format, reward)
    }

    pub fn close_task(ctx: Context<CloseTaskContext>) -> Result<()> {
     task::close_task(ctx)
    }

    pub fn assign_task(ctx: Context<AssignTaskContext>) -> Result<()> {
        task::assign(ctx)
    }

    pub fn assign_task_by_endpoint(ctx: Context<AssignTaskByEndpointContext>) -> Result<()> {
        task::assign_task_by_endpoint(ctx)
    }

    pub fn complete_task(ctx: Context<CompleteTaskContext>, ipfs_hash: String) -> Result<()> {
        task::complete(ctx, ipfs_hash)
    }

    pub fn claim_task_rewards(ctx: Context<ClaimTaskRewardsContext>) -> Result<()> {
        task::rewards(ctx)
    }

    // Dataset Instructions
    pub fn download_dataset(ctx: Context<DownloadDatasetContext>) -> Result<()> {
        dataset::download(ctx)
    }

    pub fn preview_dataset(ctx: Context<PreviewDatasetContext>) -> Result<()> {
        dataset::preview(ctx)
    }
}
