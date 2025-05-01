use {
    anchor_lang::prelude::*,
    anchor_spl::{token_interface::{Mint, TokenAccount, TokenInterface}},
};

declare_id!("your_program_id_here");

// Constants for seeds
pub const NETWORK_STATE_SEED: &[u8] = b"state";
pub const VAULT_SEED: &[u8] = b"vault"; 
pub const VAULT_AUTH_SEED: &[u8] = b"vault_authority";
pub const PROVIDER_SEED: &[u8] = b"provider";
pub const QUALITY_FEED: &str = "YOUR_SWITCHBOARD_FEED_ADDRESS";


#[error_code]
pub enum ErrorCode {
    InvalidStakeAmount,
    InsufficientReputation,
    InsufficientQuality,
    StaleFeed
}