import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

// Constants
const PROGRAM_ID = "7pqme6UtiQshBaes6hQ2HkEwnwUph1JsEujZzKi9rmxU";
const SCRAPE_MINT = new PublicKey("6F2hasc11STQVPcZfX6E767wWV6TZXQRw74fAe11hCH3");

// Function to derive the tokenVault PDA (same as findTokenVaultPda in program.ts)
async function findTokenVaultPda(): Promise<PublicKey> {
  const [tokenVault, _] = await PublicKey.findProgramAddress(
    [Buffer.from("token_vault")],
    new PublicKey(PROGRAM_ID)
  );
  return tokenVault;
}

// Main function to compute the vault_token_account address
async function getVaultTokenAccountAddress() {
  try {
    // Derive the tokenVault PDA
    const tokenVault = await findTokenVaultPda();
    console.log("Token Vault PDA:", tokenVault.toString());

    // Derive the associated token account address for the tokenVault PDA
    const vaultTokenAccount = await getAssociatedTokenAddress(
      SCRAPE_MINT, // Mint address ($SCRAPE)
      tokenVault, // Owner (tokenVault PDA)
      true // Allow owner off-curve (since tokenVault is a PDA)
    );

    console.log("Vault Token Account Address:", vaultTokenAccount.toString());
  } catch (error) {
    console.error("Error computing vault token account address:", error);
  }
}

// Run the function
getVaultTokenAccountAddress();