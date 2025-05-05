use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct ProviderNode {
    pub bump: u8,               // Bump seed for PDA
    pub owner: Pubkey,          // Node operator's public key
    pub ipv4: [u8; 4],          // IPv4 address of the node (e.g., [192, 168, 1, 1])
    pub proxy_port: u16,        // Port for proxy requests
    pub client_port: u16,       // Port for client communication
    pub bandwidth_limit: u64,   // Max bandwidth (MB/hour)
    pub bandwidth_used: u64,    // Bandwidth used (MB)
    pub reputation: u64,        // Reputation score
    pub rewards: u64,           // Earned rewards (in $SCRAPE tokens)
    pub active: bool,           // Node status
    pub token_account: Pubkey,  // Node operator's $SCRAPE token account
    pub last_bonus_claim: u64,  // Last reputation score at which bonus was claimed
}

impl ProviderNode {
    pub const PREFIX: &'static str = "PROVIDER_NODE";

    pub const SIZE: usize = 8 + // Discriminator
        std::mem::size_of::<u8>() + // bump
        std::mem::size_of::<Pubkey>() + // owner
        4 * std::mem::size_of::<u8>() + // ipv4
        4 * std::mem::size_of::<u16>() + // proxy_port
        4 * std::mem::size_of::<u16>() + // client_port
        std::mem::size_of::<u64>() + // bandwidth_limit
        std::mem::size_of::<u64>() + // bandwidth_used
        std::mem::size_of::<u64>() + // reputation
        std::mem::size_of::<u64>() + // rewards
        std::mem::size_of::<bool>() + // active
        std::mem::size_of::<Pubkey>() + // token_account
        std::mem::size_of::<u64>() + // last_bonus_claim
        64; // padding
}