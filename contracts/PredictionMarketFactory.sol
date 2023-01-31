// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./Market.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error PredictionMarket__IneligiblePredictionCutoffTime();
error PredictionMarket__IneligibleExpirationTime();
error PredictionMarket__NotEnoughEth();
error PredictionMarket__PredictionsClosed();


contract PredictionMarketFactory {

  address public immutable i_owner;

  address[] private i_priceFeeds; // 0: ethUsd, 1: btcUsd, 2: dogeUsd
  mapping(uint256 => address) markets;
  uint256 private numMarkets;

  event MarketCreated(address indexed marketCreator, uint256 indexed asset, uint256 entryFee, uint256 predictionCutoffTime, uint256 expirationTime);

  constructor (address _ethUsdPriceFeed, address _btcUsdPriceFeed, address _dogeUsdPriceFeed) {
    i_owner = msg.sender;
    numMarkets = 0;
    i_priceFeeds.push(_ethUsdPriceFeed);
    i_priceFeeds.push(_btcUsdPriceFeed);
    i_priceFeeds.push(_dogeUsdPriceFeed);
  }

  /**
   * @notice this function allows users to send ETH directly to this contract
   * it is called whenever someone simply sends eth to this contract without using a specific function call, or interacts with the contract without sending any data
   * @dev it does not use the "function" keyword because it is a special function name in Solidity that Solidity knows about (just like "constructor" is another special keyword, it does not take the word "function" prior to it because Solidity knows constructor is a special function)
   */
  receive() external payable {}


  /**
   * @notice this function creates a new prediction market
   * @param _asset ETH, BTC, or DOGE
   * @param _entryFee Usd entry fee for predictors
   * @param _predictionCutoffTime seconds since epoch when predictions can no longer be accepted
   * @param _expirationTime seconds since epoch when the market is targeting the price everyone is trying to predict
   */
  function createMarket(uint256 _asset, uint256 _entryFee, uint256 _predictionCutoffTime, uint256 _expirationTime) payable public {
    if (_predictionCutoffTime <= block.timestamp) {
      revert PredictionMarket__IneligiblePredictionCutoffTime();
    }
    if (_expirationTime <= block.timestamp) {
      revert PredictionMarket__IneligibleExpirationTime();
    }


    // this is a way to extract the contract address from the returned value
    address _marketAddress = address((new Market){value: msg.value}(_asset, _entryFee, _predictionCutoffTime, _expirationTime, i_priceFeeds[_asset]));

    markets[numMarkets] = _marketAddress;

    numMarkets += 1;

    emit MarketCreated(msg.sender, _asset, _entryFee, _predictionCutoffTime, _expirationTime);

  }

  function getOwner() public view returns (address) {
    return i_owner;
  }


  function getMarket(uint256 _index) public view returns (address) {
    return markets[_index];
  }

  function getPriceFeeds() public view returns (address[] memory) {
    return i_priceFeeds;
  }

  function getNumMarkets() public view returns (uint256) {
    return numMarkets;
  }

  // function destroy() public payable onlyOwner {
  //   selfdestruct(payable(i_owner));
  // }

}