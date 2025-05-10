use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct NodeRegistry {
    pub bump: u8,               // Bump seed for PDA
    pub nodes: Vec<Pubkey>,     // List of ProviderNode owner public keys
}

impl NodeRegistry {
    pub const PREFIX: &'static str = "NODE_REGISTRY";

    // Initial space allocation: discriminator + bump + Vec<Pubkey>
    // We allocate space for the discriminator, bump, and a Vec with initial capacity
    pub const BASE_SIZE: usize = 8 + // Discriminator
        std::mem::size_of::<u8>() + // bump
        4; // Vec length prefix (u32)

    // Space per node entry (each Pubkey is 32 bytes)
    pub const NODE_ENTRY_SIZE: usize = std::mem::size_of::<Pubkey>();

    // Calculate total space needed for a given number of nodes
    pub fn calculate_size(num_nodes: usize) -> usize {
        Self::BASE_SIZE + (num_nodes * Self::NODE_ENTRY_SIZE)
    }
}