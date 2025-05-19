use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct EndpointNode {
    pub bump: u8,           // Bump seed for PDA
    pub owner: Pubkey,      // Node operator's public key
}

impl EndpointNode {
    pub const PREFIX: &'static str = "ENDPOINT_NODE";

    pub const SIZE: usize = 8 + // Discriminator
        std::mem::size_of::<u8>() + // bump
        std::mem::size_of::<Pubkey>() + // owner
        64; // padding
}