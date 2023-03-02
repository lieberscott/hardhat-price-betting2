// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

error Market__MustExpireInFuture();
error Market__PredictionsClosed();
error Market__Ended();
error Market__ExpirationTimeNotReached();
error Market__NotEnoughEth();
error Market__PayoutFailed();
error Market__StillOpen();


/** @title A prediction market for crypto prices
 * @author Scott Lieber
 * @notice This contract is to add a layer of protection to a user's funds
 * @dev No additional data
 */
contract Market {

  struct prediction {
    address bettorAddress;
    uint256 priceGuess;
  }

  uint256 private immutable i_asset; // 0: ETH, 1: BTC, 2: DOGE
  uint256 private immutable i_expirationTime;
  uint256 private immutable i_entryFee;
  address private immutable i_priceFeed;
  uint256 private immutable i_deployTime;
  uint256 private immutable i_predictionCutoffTime;
  uint256 private s_open; // 0 - open, 1 - processing winner, 2 - complete (and can be destroyed)
  
  prediction[] private predictions;
  // mapping(address => uint256) addressToPrediction; // prevent double bets

  event PredictionMade(address indexed predictor, uint256 indexed price);
  event WinnerChosen(address indexed winner, uint256 indexed _amount, uint256 _asset);

  constructor(uint256 _asset, uint256 _entryFee, uint256 _predictionCutoffTime, uint256 _expirationTime, address _priceFeed) payable {
    if (_expirationTime <= block.timestamp) {
      revert Market__MustExpireInFuture();
    }

    i_asset = _asset;
    i_expirationTime = _expirationTime;
    i_entryFee = _entryFee;
    i_priceFeed = _priceFeed;
    i_deployTime = block.timestamp;
    i_predictionCutoffTime = _predictionCutoffTime;
    s_open = 0;
  }

  /**
   * @notice this function allows users to send ETH directly to this contract
   * it is called whenever someone simply sends eth to this contract without using a specific function call, or interacts with the contract without sending any data
   * @dev it does not use the "function" keyword because it is a special function name in Solidity that Solidity knows about (just like "constructor" is another special keyword, it does not take the word "function" prior to it because Solidity knows constructor is a special function)
   */
  receive() external payable {}

  /**
   * @notice allows users to withdraw up to their daily limit
   */
  function makePrediction(uint256 _price) public payable {

    if (msg.value < i_entryFee) {
      revert Market__NotEnoughEth();
    }
    if (i_predictionCutoffTime < block.timestamp) {
      revert Market__PredictionsClosed();
    }

   predictions.push(prediction(msg.sender, _price));

   emit PredictionMade(msg.sender, _price);
  }

  /**
   * @notice once the market prediction date has arrived, anyone can call this function to get the current price
   */
  function endMarket() public payable {

    if (s_open == 1) {
      revert Market__Ended();
    }

    if (block.timestamp < i_expirationTime) {
      revert Market__ExpirationTimeNotReached();
    }

    s_open = 1;

    AggregatorV3Interface priceFeed = AggregatorV3Interface(i_priceFeed);
    (,int256 price,,,) = priceFeed.latestRoundData();

    uint256 assetPrice = uint256(price * 1e10);

    // go through the array and find the person closest to the price

    // initialize the closestGuess to the first person in the array, then, below, go through the array and see if anyone has beaten them
    uint256 closestDiff = getPriceDifference(predictions[0].priceGuess, assetPrice);
    uint256 winnerIndex = 0;

    uint256 len = predictions.length;

    for (uint256 i = 0; i < len; i++) {
      uint256 difference = getPriceDifference(predictions[i].priceGuess, assetPrice);
      // if there is a tie, the winner will be the first person who guessed
      if (difference < closestDiff) {
        closestDiff = difference;
        winnerIndex = i;
      }
    }

    // winner has been identified, so pay out the winner
    uint256 amount = address(this).balance;

    (bool callSuccess,) = payable(predictions[winnerIndex].bettorAddress).call{value: amount}("");

    if (!callSuccess) {
      revert Market__PayoutFailed();
    }

    emit WinnerChosen(predictions[winnerIndex].bettorAddress, amount, uint256(i_asset));

  }

  function getPriceDifference(uint256 _guess, uint256 _actualPrice) internal pure returns (uint256) {
    return _guess >= _actualPrice ? _guess - _actualPrice : _actualPrice - _guess;
  }

  function getEthBalance() public view returns (uint256) {
    return address(this).balance;
  }

  function getAsset() public view returns (uint256) {
    return i_asset;
  }

  function getExpirationTime() public view returns (uint256) {
    return i_expirationTime;
  }

  function getEntryFee() public view returns (uint256) {
    return i_entryFee;
  }

  function getDeployTime() public view returns (uint256) {
    return i_deployTime;
  }

  function getCutoffTime() public view returns (uint256) {
    return i_predictionCutoffTime;
  }

  function getIsOpen() public view returns (uint256) {
    return s_open;
  }

  function getNumPlayers() public view returns (uint256) {
    return predictions.length;
  }

  function getPredictions() public view returns (prediction[] memory) {
    return predictions;
  }

  function getPriceFeed() public view returns (address) {
    return i_priceFeed;
  }

}