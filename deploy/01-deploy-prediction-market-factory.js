const { network, ethers } = require("hardhat")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
require("dotenv").config()

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    console.log("chainId : ", chainId);
    let predictionMarketFactory, mockAddress, ethUsdPriceFeed, btcUsdPriceFeed, dogeUsdPriceFeed;


    log("----------------------------------------------------");
    if (!developmentChains.includes(network.name)) {
      ethUsdPriceFeed = networkConfig[chainId].ethUsdPriceFeed
      btcUsdPriceFeed = networkConfig[chainId].btcUsdPriceFeed
      dogeUsdPriceFeed = networkConfig[chainId].dogeUsdPriceFeed
    }
    else {
      log("getting mockV3Aggregator contracts...");
      const mockEthContract = await deployments.get("MockV3Aggregator_ETH")
      const mockBtcContract = await deployments.get("MockV3Aggregator_BTC")
      const mockDogeContract = await deployments.get("MockV3Aggregator_DOGE")
      ethUsdPriceFeed = mockEthContract.address;
      btcUsdPriceFeed = mockBtcContract.address;
      dogeUsdPriceFeed = mockDogeContract.address;
      log(`mockV3Aggregator contracts (ETH, BTC, DOGE) : ${mockEthContract.address}, ${mockBtcContract.address}, ${mockDogeContract.address}`)
      log("Deploying PredictionMarketFactory and waiting for confirmations...");
    }


    predictionMarketFactory = await deploy("PredictionMarketFactory", {
      from: deployer,
      log: true,
      args: [ethUsdPriceFeed, btcUsdPriceFeed, dogeUsdPriceFeed],
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
      // if it's a dev chain, deploy a prediction market contract and get the abi
      console.log('deploying instance ...');
      const accounts = await ethers.getSigners(); // could also do with getNamedAccounts
      // const mainAccount = accounts[1];
      // const safekeeperAccount = accounts[2];

      const factoryContract = await ethers.getContract("PredictionMarketFactory");

      const secondsSinceEpoch = Math.floor(new Date() / 1000);

      const hoursFromNowArr = [];

      const numDeployments = 10;

      for (let i = 0; i < numDeployments; i++) {
        hoursFromNowArr.push(secondsSinceEpoch + (60 * 60 * i));
      }


      // createMarket(asset, entryFee (0.1 ETH), predictionCutoffTime, expirationTime)

      for (let j = 0; j < numDeployments - 2; j++) {
        const asset = (j % 3).toString();
        const res = await factoryContract.createMarket(asset, "100000000000000000", hoursFromNowArr[j + 1].toString(), hoursFromNowArr[j + 2].toString(), { from: deployer /*, value: "3000000000000000000" */ })
      }

      console.log(`Instances deployed`)


    }
}

module.exports.tags = ["all", "savingsaccountfactory"];