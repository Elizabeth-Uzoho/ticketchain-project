require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

const { SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY } = process.env;
const normalizedPrivateKey =
  typeof PRIVATE_KEY === "string" && /^0x[a-fA-F0-9]{64}$/.test(PRIVATE_KEY)
    ? PRIVATE_KEY
    : null;

module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: normalizedPrivateKey ? [normalizedPrivateKey] : [],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY || "",
  },
};