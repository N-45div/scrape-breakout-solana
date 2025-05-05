use anchor_lang::prelude::*;

pub mod state;
pub use state::*;

declare_id!("DKo9acezHZRQs8cZTkmzaoMC9MjUDKXeexYMdUNgTqyz");

#[program]
pub mod scrape {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
