const { ethers, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config")
const fs = require("fs");
require("dotenv").config();

// import { contractAddresses } from "../../nextjs-price-betting2/constants"

const FRONT_END_ADDRESSES_FILE  = "../nextjs-price-betting2/constants/contractAddresses.json";
const FRONT_END_FACTORY_ABI_FILE  = "../nextjs-price-betting2/constants/factoryAbi.json";
const FRONT_END_INSTANCE_ABI_FILE  = "../nextjs-price-betting2/constants/instanceAbi.json";

module.exports = async ({ deployments }) => {

  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating Front end");
    const predictionMarketFactory = await deployments.get("PredictionMarketFactory");
    updateContractAddresses(predictionMarketFactory);
    // updateAbi();
  }
}

const updateAbi = async () => {
    const predictionMarketFactory = ethers.getContract("PredictionMarketFactory");
    const marketInstance = ethers.getContract("Market");

    fs.writeFileSync(FRONT_END_FACTORY_ABI_FILE, predictionMarketFactory.interface.format(ethers.utils.FormatTypes.json));
    fs.writeFileSync(FRONT_END_INSTANCE_ABI_FILE, marketInstance.interface.format(ethers.utils.FormatTypes.json));
}

const updateContractAddresses = async (predictionMarketFactory) => {

    // const predictionMarketFactory = await deployments.get("PredictionMarketFactoy");

    const chainId = network.config.chainId.toString();

    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"));
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(predictionMarketFactory.address)) {
            currentAddresses[chainId].push(predictionMarketFactory.address);
        }
    }
    else {
        currentAddresses[chainId] = [predictionMarketFactory.address];
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

module.exports.tags = ["all", "frontend"];