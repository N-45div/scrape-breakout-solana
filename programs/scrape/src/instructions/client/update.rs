use crate::state::client::Client;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateClientReportContext<'info> {
    #[account(mut)]
    pub client: Box<Account<'info, Client>>,
    pub signer: Signer<'info>,
}

#[inline(never)]
pub fn update_report(ctx: Context<UpdateClientReportContext>) -> Result<()> {
    let client = &mut ctx.accounts.client;

    // For now, this is a placeholder since Client only has task_counter
    // In the future, you could add fields like bandwidth_used to Client and update them here
    msg!("Client report updated for user: {}. Task count: {}", client.owner, client.task_counter);
    Ok(())
}