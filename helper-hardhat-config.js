const networkConfig = {
  31337: {
    name: "localhost",
  },
  // Price Feed Address, values can be obtained at https://docs.chain.link/docs/reference-contracts
  5: {
    name: "goerli",
    ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
  },
  421613: {
    name: "arbitrumGoerli",
    ethUsdPriceFeed: "0x62CAe0FA2da220f43a51F86Db2EDb36DcA9A5A08",
    btcUsdPriceFeed: "0x6550bc2301936011c1334555e62A87705A81C12C",
    dogeUsdPriceFeed: "0x1692Bdd32F31b831caAc1b0c9fAF68613682813b" // this is the USDC/USD price feed, since there is NOT a Doge price feed on Aribtrum Goerli
  },
  42161: {
    name: "arbitrumOne",
    ethUsdPriceFeed: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
    btcUsdPriceFeed: "0x6ce185860a4963106506C203335A2910413708e9",
    dogeUsdPriceFeed: "0x9A7FB1b3950837a8D9b40517626E11D4127C098C"
  },
  80001: {
    name: "polygonMumbai",
    ethUsdPriceFeed: "0x0715A7794a1dc8e42615F059dD6e406A6594651A",
    btcUsdPriceFeed: "0x007A22900a3B98143368Bd5906f8E17e9867581b",
    dogeUsdPriceFeed: "0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0" // this is the USDC/USD price feed, since there is NOT a Doge priceFeed for the mumbai testnet
  }
}

const developmentChains = ["hardhat", "localhost"]

module.exports = {
  networkConfig,
  developmentChains,
}