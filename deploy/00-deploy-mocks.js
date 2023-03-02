const { network } = require("hardhat")

const DECIMALS = "8"
const INITIAL_ETH_PRICE = "200000000000" // 2000
const INITIAL_BTC_PRICE = "2000000000000" // 20,000
const INITIAL_DOGE_PRICE = "10000000" // 0.10
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    // If we are on a local development network, we need to deploy mocks!
    if (chainId == 31337) {
        log("Local network detected! Deploying mocks...")
        await deploy("MockV3Aggregator_ETH", {
            contract: "MockV3Aggregator",
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_ETH_PRICE],
        })

        await deploy("MockV3Aggregator_BTC", {
            contract: "MockV3Aggregator",
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_BTC_PRICE],
        })

        await deploy("MockV3Aggregator_DOGE", {
            contract: "MockV3Aggregator",
            from: deployer,
            log: true,
            args: [DECIMALS, INITIAL_DOGE_PRICE],
        })

        log("Mocks Deployed!")
        log("------------------------------------------------")
        log(
            "You are deploying to a local network, you'll need a local network running to interact"
        )
        log(
            "Please run `npx hardhat console` to interact with the deployed smart contracts!"
        )
        log("------------------------------------------------")
    }
}
module.exports.tags = ["all", "mocks"]
