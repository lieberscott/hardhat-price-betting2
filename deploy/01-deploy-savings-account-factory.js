const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config()

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let predictionMarketFactory;


    log("----------------------------------------------------");
    log("getting mockV3Aggregator contracts...");
    const mockV3AggregatorContracts = await deployments.get("MockV3Aggregator")
    log(`mockV3Aggregator contracts : ${JSON.stringify(mockV3AggregatorContracts)}`)
    const ethUsdPriceFeedAddress = mockV3AggregatorContracts.address;
    log(`ethUsdPriceFeedAddress : ${ethUsdPriceFeedAddress[0].address}`);
    log("Deploying SavingsAccountFactory and waiting for confirmations...");
    predictionMarketFactory = await deploy("PredictionMarketFactory", {
        from: deployer,
        log: true,
        args: ["0x0000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000002", "0x0000000000000000000000000000000000000003"],
        // we need to wait if on a live network so we can verify properly
        waitConfirmations: network.config.blockConfirmations || 1,
    })
    log(`PredictionMarketFactory deployed at ${predictionMarketFactory.address}`);

    // if not a dev chain, then verify contract
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(predictionMarketFactory.address);
    }
    else {
      // if it's a dev chain, deploy a savings account contract and get the abi
      // const factoryContract = ethers.getContractFactory("SavingsAccountFactory");
      console.log('deploying instance ...');
      const accounts = await ethers.getSigners(); // could also do with getNamedAccounts
      const mainAccount = accounts[1];
      const safekeeperAccount = accounts[2];

      const factoryContract = await ethers.getContract("PredictionMarketFactory")

      // const res = await factoryContract.createSavingsAccount(mainAccount.address, safekeeperAccount.address, "1000000000000000000", "100000000000000000", "Scott's Account", { from: deployer, value: "3000000000000000000" })
      // const res2 = await factoryContract.createSavingsAccount(safekeeperAccount.address, mainAccount.address, "1000000000000000000", "100000000000000000", "Ryan's Account", { from: deployer, value: "3000000000000000000" })

      console.log(`Instances deployed`)

      // get contract instances so you can send the MyTokens to them

      // entryFee = 0.01
    // asset, entryFee, predictionCutoffTime, expirationTime
    // const secondsSinceEpoch = Math.floor(new Date() / 1000);
    // const predictionCutoffTime = secondsSinceEpoch + (60 * 60); // epoch + 1 hour
    // const expirationTime = predictionCutoffTime + (60 * 60); // epoch + 2 hours
    // const ethMarketAddress = (await factoryContract.createMarket("0", "0", predictionCutoffTime.toString(), expirationTime.toString())).toString()

    // console.log("marketAddress : ", ethMarketAddress.address);

    // const tokenContract = await ethers.getContract("MyToken")

    // const transaction1 = await tokenContract.connect(mainAccount).transfer(mainUserInstanceAddress, initialTransferAmount)
    // const transaction2 = await tokenContract.connect(safekeeperAccount).transfer(safekeeperUserInstanceAddress, initialTransferAmount)

    // log("Transfered tokens to savings account addresses complete")


    }
}

module.exports.tags = ["all", "savingsaccountfactory"];