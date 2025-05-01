#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<NetworkState>()
    )]
    pub network_state: Account<'info, NetworkState>,

    #[account(
        mint::token_program = token_program,
        mint::authority = authority
    )]
    pub token_mint: InterfaceAccount<'info, token_interface::Mint>,
    
    pub token_program: Interface<'info, token_interface::TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>
}