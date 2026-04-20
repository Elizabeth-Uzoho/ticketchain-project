import hardhat from "hardhat";

const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer signer found. Check your .env file and ensure PRIVATE_KEY is a valid 0x-prefixed key."
    );
  }

  console.log(`Deploying TicketChain with account: ${deployer.address}`);

  // Deploying the main TicketChain contract
  const TicketChain = await ethers.getContractFactory("TicketRegistry");
  
  // We pass the deployer's address as the initial organizer/admin
  const ticketChain = await TicketChain.deploy();
  
  await ticketChain.waitForDeployment();

  console.log(`TicketChain deployed to: ${await ticketChain.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});