use anchor_lang::prelude::*;


#[account]
#[derive(Default, Debug)]
pub struct TokenVault {
    pub bump: u8,               // Bump seed for PDA
    pub owner: Pubkey,          // Program owner or authority (for future withdrawal)
    pub token_account: Pubkey,  // The token account holding $SCRAPE tokens
    pub total_rewards_distributed: u64, // Total $SCRAPE rewards distributed
    pub bandwidth_paid: u64,    // Total bandwidth paid for (in MB, aggregated across tasks)
    pub bandwidth_used: u64,    // Total bandwidth used (in MB, aggregated across tasks)
}

impl TokenVault {
    pub const PREFIX: &'static str = "TOKEN_VAULT";

    pub const SIZE: usize = 8 + // Discriminator
        std::mem::size_of::<u8>() + // bump
        std::mem::size_of::<Pubkey>() + // owner
        std::mem::size_of::<Pubkey>() + // token_account
        std::mem::size_of::<u64>() + // total_rewards_distributed
        std::mem::size_of::<u64>() + // bandwidth_paid
        std::mem::size_of::<u64>() + // bandwidth_used
        64; // padding
}