use {
    anchor_lang::prelude::*,
    anchor_spl::{
        token_interface::{self, Mint, TokenAccount, TokenInterface},
    },
    std::str::FromStr,
    switchboard_solana::AggregatorAccountData,
    anchor_lang::solana_program;
    crate::state::*,  // Import state structs
};

// Add constants
pub const NETWORK_STATE_SEED: &[u8] = b"state";
pub const VAULT_SEED: &[u8] = b"vault"; 
pub const VAULT_AUTH_SEED: &[u8] = b"vault_authority";
pub const PROVIDER_SEED: &[u8] = b"provider";
pub const QUALITY_FEED: &str = "YOUR_SWITCHBOARD_FEED_ADDRESS";

// Add error enum
#[error_code]
pub enum ErrorCode {
    InvalidStakeAmount,
    InsufficientReputation,
    InsufficientQuality,
    StaleFeed
}

declare_id!("BAn8AebKFtgHZTUgqZcfZjkSMFhLMXZGG4JMQvjR3uDY");

#[program]
pub mod scrape {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        minimum_stake: u64,
    ) -> Result<()> {
        let network_state = &mut ctx.accounts.network_state;
        
        network_state.bump = ctx.bumps["network_state"];
        network_state.vault_bump = *ctx.bumps.get("vault").unwrap();
        network_state.total_providers = 0;
        network_state.active_providers = 0;
        network_state.total_bandwidth = 0;
        network_state.minimum_stake = minimum_stake;
        network_state.token_mint = ctx.accounts.token_mint.key();
        network_state.vault_authority = ctx.accounts.vault_authority.key();

        Ok(())
    }
    pub fn register_provider(
        ctx: Context<RegisterProvider>,
        ip_hash: [u8; 32],
        stake_amount: u64
    ) -> Result<()> {
        let network_state = &mut ctx.accounts.network_state;
        let provider_state = &mut ctx.accounts.provider_state;

        // Verify stake amount meets minimum
        require!(
            stake_amount >= network_state.minimum_stake,
            ErrorCode::InvalidStakeAmount
        );

        // Initialize provider state
        provider_state.bump = *ctx.bumps.get("provider_state").unwrap();
        provider_state.user = ctx.accounts.user.key();
        provider_state.ip_hash = ip_hash;
        provider_state.stake_amount = stake_amount;
        provider_state.uptime_score = 0;
        provider_state.bandwidth_provided = 0;
        provider_state.last_active = Clock::get()?.unix_timestamp;
        provider_state.rewards_earned = 0;

        // Update network state
        network_state.total_providers += 1;
        network_state.active_providers += 1;


        // Transfer stake to vault
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            token_interface::TransferChecked {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
                mint: ctx.accounts.token_mint.to_account_info(),
            },
        );
        
        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.token_mint.decimals)?;

        Ok(())
    }

    pub fn check_uptime(
        ctx: Context<CheckUptime>,
        bandwidth_provided: u64
    ) -> Result<()> {
        let feed = &ctx.accounts.feed_aggregator.load()?;
        let provider = &mut ctx.accounts.provider_state;
        let current_time = Clock::get()?.unix_timestamp;
        
        // Verify data freshness
        if (current_time - feed.latest_confirmed_round.round_open_timestamp) <= 30 {
            provider.uptime_score += 1;
            provider.bandwidth_provided += bandwidth_provided;
            provider.last_active = current_time;
            
            ctx.accounts.network_state.total_bandwidth += bandwidth_provided;
        }
        
        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let provider = &mut ctx.accounts.provider_state;
        let current_time = Clock::get()?.unix_timestamp;
        
        // Calculate rewards based on uptime and bandwidth
        let base_reward = 100; // Example base reward
        let uptime_multiplier = provider.uptime_score;
        let bandwidth_multiplier = provider.bandwidth_provided / 1_000_000; // Per MB
        
        let reward_amount = base_reward
            .checked_mul(uptime_multiplier)
            .unwrap()
            .checked_mul(bandwidth_multiplier)
            .unwrap();
            
        // Transfer rewards
        let seeds = &[
            VAULT_AUTH_SEED,
            &[*ctx.bumps.get("vault_authority").unwrap()]
        ];
        let signer = &[&seeds[..]];
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.vault_authority.to_account_info(),
            },
            signer
        );
        
        anchor_spl::token_interface::transfer(cpi_ctx, reward_amount)?;
        
        // Update state
        provider.rewards_earned += reward_amount;
        provider.uptime_score = 0;  // Reset for next period
        provider.bandwidth_provided = 0;
        
        Ok(())
    }

    pub fn create_task(
        ctx: Context<CreateTask>,
        semantic_filters: String,
        data_format: String,
        reward_per_submission: u64,
        total_budget: u64,
        required_reputation: u64,
        min_providers: u32,
        data_quality_threshold: u64
    ) -> Result<()> {
        let task = &mut ctx.accounts.task;
        
        task.requester = ctx.accounts.requester.key();
        task.semantic_filters = semantic_filters;
        task.data_format = data_format;
        task.reward_per_submission = reward_per_submission;
        task.total_budget = total_budget;
        task.required_reputation = required_reputation;
        task.min_providers = min_providers;
        task.completed_submissions = 0;
        task.data_quality_threshold = data_quality_threshold;
        
        // Transfer total budget to vault
        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token_interface::Transfer {
                from: ctx.accounts.requester_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.requester.to_account_info(),
            },
        );
        
        anchor_spl::token_interface::transfer(cpi_ctx, total_budget)?;
        
        Ok(())
    }

    pub fn submit_data(
        ctx: Context<SubmitData>,
        data_hash: [u8; 32]
    ) -> Result<()> {
        let provider_state = &ctx.accounts.provider_state;
        let task = &ctx.accounts.task;
        
        // Verify provider meets reputation requirement
        require!(
            provider_state.reputation_score >= task.required_reputation,
            ErrorCode::InsufficientReputation
        );
        
        // Get feed for data quality validation
        let feed = &ctx.accounts.feed_aggregator.load()?;
        
        // Check if feed is stale (last 5 minutes)
        feed.check_staleness(
            Clock::get()?.unix_timestamp,
            300
        ).map_err(|_| error!(ErrorCode::StaleFeed))?;
        
        // Get quality score from oracle
        let quality_score: u64 = feed.get_result()?.try_into()?;
        
        require!(
            quality_score >= task.data_quality_threshold,
            ErrorCode::InsufficientQuality  
        );
    
        // Record submission
        let submission = &mut ctx.accounts.submission;
        submission.provider = ctx.accounts.provider.key();
        submission.task = ctx.accounts.task.key(); 
        submission.submission_time = Clock::get()?.unix_timestamp;
        submission.quality_score = quality_score;
        submission.data_hash = data_hash;
        
        // Update task state
        let task = &mut ctx.accounts.task;
        task.completed_submissions += 1;
    
        Ok(())
    }

    pub fn process_rewards(
        ctx: Context<ProcessRewards>,
        submission_index: u64,
        batch_size: u64
    ) -> Result<()> {
        let task = &ctx.accounts.task;
        
        // Calculate reward batch range
        let start_idx = submission_index;
        let end_idx = std::cmp::min(
            submission_index + batch_size,
            task.completed_submissions
        );
        
        // Process rewards for batch
        for idx in start_idx..end_idx {
            // Get submission at index
            let submission_account = &ctx.remaining_accounts[idx as usize];
            let submission = Account::<TaskSubmission>::try_from(submission_account)?;
            
            // Calculate reward based on quality score
            let reward = calculate_reward(
                task.reward_per_submission,
                submission.quality_score
            );
            
            // Transfer reward
            let seeds = &[
                VAULT_AUTH_SEED,
                &[*ctx.bumps.get("vault_authority").unwrap()]
            ];
            let signer = &[&seeds[..]];
            
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: // Provider token account,
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer
            );
            
            token::transfer(cpi_ctx, reward)?;
        }
        
        Ok(())
    }

}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        seeds = [NETWORK_STATE_SEED],
        bump,
        space = 8 + std::mem::size_of::<NetworkState>()
    )]
    pub network_state: Account<'info, NetworkState>,

    /// CHECK: PDA that will own the vault
    #[account(
        seeds = [VAULT_AUTH_SEED],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [VAULT_SEED],
        bump,
        token::mint = token_mint,
        token::authority = vault_authority,
        token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mint::token_program = token_program,
        mint::authority = authority
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,
    
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}

#[derive(Accounts)]
pub struct RegisterProvider<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [NETWORK_STATE_SEED],
        bump = network_state.bump,
    )]
    pub network_state: Account<'info, NetworkState>,

    #[account(
        init,
        payer = user,
        seeds = [PROVIDER_SEED, user.key().as_ref()],
        bump,
        space = 8 + std::mem::size_of::<IPProviderState>()
    )]
    pub provider_state: Account<'info, IPProviderState>,

    #[account(
        mut,
        token::mint = token_mint,
        token::authority = user
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = network_state.vault_bump,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckUptime<'info> {
    pub feed_aggregator: AccountLoader<'info, AggregatorAccountData>,
    
    #[account(mut)]
    pub provider_state: Account<'info, IPProviderState>,
    
    #[account(mut)]
    pub network_state: Account<'info, NetworkState>,
    
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [PROVIDER_SEED, user.key().as_ref()],
        bump = provider_state.bump
    )]
    pub provider_state: Account<'info, IPProviderState>,
    
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = network_state.vault_bump
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = user
    )]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    
    /// CHECK: PDA that owns the vault
    #[account(
        seeds = [VAULT_AUTH_SEED],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    pub token_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CreateTask<'info> {
    #[account(mut)]
    pub requester: Signer<'info>,
    
    #[account(
        init,
        payer = requester,
        space = 8 + std::mem::size_of::<ScrapingTask>()
    )]
    pub task: Account<'info, ScrapingTask>,
    
    pub feed_aggregator: AccountLoader<'info, AggregatorAccountData>,
    
    #[account(mut)]
    pub requester_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>
}

#[derive(Accounts)]
pub struct SubmitData<'info> {
    #[account(mut)]
    pub provider: Signer<'info>,
    
    #[account(
        mut,
        seeds = [PROVIDER_SEED, provider.key().as_ref()],
        bump = provider_state.bump
    )]
    pub provider_state: Account<'info, IPProviderState>,
    
    #[account(mut)]
    pub task: Account<'info, ScrapingTask>,
    
    #[account(
        init,
        payer = provider,
        space = 8 + std::mem::size_of::<TaskSubmission>()
    )]
    pub submission: Account<'info, TaskSubmission>,
    
    // Add Switchboard feed for data quality validation
    #[account(
        address = Pubkey::from_str(QUALITY_FEED).unwrap()
    )]
    pub feed_aggregator: AccountLoader<'info, AggregatorAccountData>,
    
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct ProcessRewards<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut)]
    pub task: Account<'info, ScrapingTask>,
    
    /// Remaining accounts should be submission accounts
    /// They will be passed in as remaining_accounts
    
    #[account(
        mut,
        seeds = [VAULT_SEED],
        bump = network_state.vault_bump
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    
    /// CHECK: PDA that owns the vault  
    #[account(
        seeds = [VAULT_AUTH_SEED],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    
    pub token_program: Interface<'info, TokenInterface>,
}
