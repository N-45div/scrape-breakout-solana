use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct Client {
    pub bump: u8,           // Bump seed for PDA
    pub owner: Pubkey,      // User who owns this state
    pub task_counter: u64,  // Local counter for user's tasks
}

impl Client {
    pub const PREFIX: &'static str = "CLIENT";

    pub const SIZE: usize = 8 + // Discriminator
        std::mem::size_of::<u8>() + // bump
        std::mem::size_of::<Pubkey>() + // owner
        std::mem::size_of::<u64>() + // task_counter
        64; // padding
}