use {
    anchor_lang::prelude::*,
    anchor_spl::{token_interface::{Mint, TokenAccount, TokenInterface}},
    switchboard_solana::AggregatorAccountData,
};

// Add your state structs here from your previous state.rs

#[account]
pub struct UptimeMetrics {
    pub last_check: i64,
    pub total_uptime: u64,
    pub consecutive_uptime: u64,
    pub total_bandwidth: u64
}

#[account]
pub struct RewardConfig {
    pub base_reward: u64,
    pub uptime_multiplier: u64,
    pub bandwidth_multiplier: u64,
    pub reward_period: i64
}

#[account]
pub struct IPProviderState {
    pub bump: u8,
    pub user: Pubkey,
    pub ip_hash: [u8; 32],
    pub stake_amount: u64,
    pub uptime_score: u64,
    pub bandwidth_provided: u64,
    pub last_active: i64,
    pub rewards_earned: u64
}

#[account]
pub struct NetworkState {
    pub bump: u8,
    pub total_providers: u64,
    pub active_providers: u64,
    pub total_bandwidth: u64,
    pub minimum_stake: u64,
    pub token_mint: Pubkey,
    pub vault_authority: Pubkey,
    pub vault_bump: u8
}

#[account]
pub struct ScrapingTask {
    pub requester: Pubkey,
    pub semantic_filters: String,    
    pub data_format: String,        
    pub reward_per_submission: u64,
    pub total_budget: u64,
    pub required_reputation: u64,
    pub min_providers: u32,
    pub completed_submissions: u64,
    pub data_quality_threshold: u64,
    // Add submissions map
    pub submissions: Vec<Pubkey> // Store submission account addresses
}

#[account]
pub struct TaskSubmission {
    pub provider: Pubkey,
    pub task: Pubkey,
    pub submission_time: i64,
    pub quality_score: u64,
    pub data_hash: [u8; 32]
}