use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized node operation.")]
    UnauthorizedNode,

    #[msg("Task is not in a state to be assigned.")]
    TaskNotAssigned,

    #[msg("Node is inactive and cannot perform operations.")]
    InactiveNode,

    #[msg("Node reputation is insufficient to claim rewards.")]
    InsufficientReputation,

    #[msg("Bandwidth usage exceeds the paid amount.")]
    BandwidthExceeded,
}