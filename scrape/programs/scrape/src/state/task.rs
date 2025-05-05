use anchor_lang::prelude::*;


#[account]
#[derive(Default, Debug)]
pub struct Task {
    pub bump: u8,               // Bump seed for PDA
    pub id: u64,                // Task ID (user-specific)
    pub owner: Pubkey,          // Task creator's public key
    pub endpoint_node: Pubkey,  // EndpointNode used for proxy routing
    pub url: String,            // URL to scrape
    pub filter: String,         // Semantic filter (e.g., "Positive Sentiment")
    pub label: String,          // Labeling (e.g., "Sentiment: Positive/Negative")
    pub format: String,         // Output format (e.g., JSONL)
    pub reward: u64,            // Reward in $SCRAPE tokens
    pub status: bool,     // Task status
    pub node_assigned: Option<Pubkey>, // Assigned node (if any)
    pub ipfs_hash: Option<String>, // IPFS hash of scraped data (after completion)
    pub dataset_size: u64,      // Size of the dataset in MB, updated after completion
}

impl Task {
    pub const PREFIX: &'static str = "TASK";

    pub const SIZE: usize = 8 + // Discriminator
        std::mem::size_of::<u8>() + // bump
        std::mem::size_of::<u64>() + // id
        std::mem::size_of::<Pubkey>() + // owner
        std::mem::size_of::<Pubkey>() + // endpoint_node
        (256 * 3) + // url, filter, label (assuming max 256 chars each)
        32 + // format (assuming max 32 chars)
        std::mem::size_of::<u64>() + // reward
        std::mem::size_of::<bool>() + // status (changed to bool)
        (1 + 32) + // node_assigned (Option<Pubkey>)
        (1 + 256) + // ipfs_hash (Option<String>, assuming max 256 chars)
        std::mem::size_of::<u64>() + // dataset_size
        64; // padding
}