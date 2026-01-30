import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SimpleVault } from "../target/types/simple_vault";
import { assert } from "chai";
import { BN } from "bn.js";

describe("simple-vault", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.simpleVault as Program<SimpleVault>;
 
      // Derive the vault and vault_wallet PDAs
    const [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );

    const [vaultWalletPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("pda"), provider.wallet.publicKey.toBuffer()],
      program.programId
    );



  it("Is initialized!", async () => {

    // Call initialize with all required accounts
    const tx = await program.methods.initialize().accounts({
      payer: provider.wallet.publicKey,
      vault: vaultPda,
      vaultWallet: vaultWalletPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    console.log("Your transaction signature", tx);

    // Fetch and verify the vault account was initialized correctly
    const vaultAccount = await program.account.vault.fetch(vaultPda);
    assert.equal(vaultAccount.signer.toString(), provider.wallet.publicKey.toString());
    assert.ok(vaultAccount.bump > 0);
    
    console.log("Vault initialized with signer:", vaultAccount.signer.toString());
  });



   it("Add Funds!", async () => {
    const amount = new BN(1000000000); // 1 SOL in lamports

    // Get balance before adding funds
    const balanceBefore = await provider.connection.getBalance(vaultWalletPda);
    console.log("Vault wallet balance before:", balanceBefore);

    // Add funds to the vault
    const tx = await program.methods.addFunds(amount).accounts({
      signer: provider.wallet.publicKey,
      vault: vaultPda,
      vaultWallet: vaultWalletPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    console.log("Add funds transaction signature:", tx);

    // Get balance after adding funds
    const balanceAfter = await provider.connection.getBalance(vaultWalletPda);
    console.log("Vault wallet balance after:", balanceAfter);

    // Verify the balance increased by the correct amount
    assert.equal((balanceAfter - balanceBefore), amount.toNumber());
    console.log(`Successfully added ${amount.toNumber()} lamports to vault`);
  });



     it("Withdraw Funds!", async () => {
    const amount = new BN(500000000); // Withdraw 0.5 SOL

    // Get balance before withdrawal
    const vaultBalanceBefore = await provider.connection.getBalance(vaultWalletPda);
    const signerBalanceBefore = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log("Vault wallet balance before withdrawal:", vaultBalanceBefore);
    console.log("Signer balance before withdrawal:", signerBalanceBefore);

    // Withdraw funds from the vault
    const tx = await program.methods.withdrawFunds(amount).accounts({
      signer: provider.wallet.publicKey,
      vault: vaultPda,
      vaultWallet: vaultWalletPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    }).rpc();

    console.log("Withdraw funds transaction signature:", tx);

    // Get balance after withdrawal
    const vaultBalanceAfter = await provider.connection.getBalance(vaultWalletPda);
    const signerBalanceAfter = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log("Vault wallet balance after withdrawal:", vaultBalanceAfter);
    console.log("Signer balance after withdrawal:", signerBalanceAfter);

    // Verify the vault balance decreased by the correct amount
    assert.equal(vaultBalanceBefore - vaultBalanceAfter, amount.toNumber());
    console.log(`Successfully withdrew ${amount.toNumber()} lamports from vault`);
  });
});
