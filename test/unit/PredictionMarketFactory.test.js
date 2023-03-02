const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("PredictionMarketFactory", () => {
      let predictionMarketFactory
      let deployer, accountOne, accountTwo;
      let market;
      const sendValue = ethers.utils.parseEther("0.1")
      const SECONDS_IN_DAY = 86400;
      const priceGuess = "2500"
      beforeEach(async () => {
        // const accounts = await ethers.getSigners()
        // deployer = accounts[0]
        const accounts = await ethers.getSigners(); // could also do with getNamedAccounts
        deployer = accounts[0];
        accountOne = accounts[1];
        accountTwo = accounts[2];
        await deployments.fixture(["all"])
        predictionMarketFactory = await ethers.getContract("PredictionMarketFactory", deployer)
      })

      describe("constructor", function () {
          
        it("sets a price feed address array", async () => {
          const response = await predictionMarketFactory.getPriceFeeds()
          assert.equal(response.length, 3)
        });

        it("creates a new market", async () => {
          const asset = "1";
          const entryFee = "100000000000000000";
          const secondsSinceEpoch = Math.floor(new Date() / 1000);
          const predictionCutoffTime = secondsSinceEpoch + (60 * 60);
          const expirationTime = secondsSinceEpoch + (60 * 60 * 2);
          // uint256 _asset, uint256 _entryFee, uint256 _predictionCutoffTime, uint256 _expirationTime
          const response = await expect(predictionMarketFactory.createMarket(asset, entryFee, predictionCutoffTime.toString(), expirationTime.toString())).to.emit(
            predictionMarketFactory,
            "MarketCreated"
          )
          .withArgs(
            deployer.address,
            asset,
            entryFee,
            predictionCutoffTime.toString(),
            expirationTime.toString()
          )
        })
      })

      describe("eth contract", function () {
        let individualMarket;
        const entryFee = "100000000000000000"; // 0.1
        const asset = 1;
        beforeEach(async () => {
          // const accounts = await ethers.getSigners()
          // deployer = accounts[0]
          const secondsSinceEpoch = Math.floor(new Date() / 1000);
          const predictionCutoffTime = secondsSinceEpoch + (60 * 60);
          const expirationTime = secondsSinceEpoch + (60 * 60 * 2);
          await predictionMarketFactory.createMarket(asset, entryFee, predictionCutoffTime.toString(), expirationTime.toString())

          const marketAddress = await predictionMarketFactory.getMarket("0");

          // create a connection to the generic Market.sol contract
          market = await ethers.getContractFactory("Market");
          // get the specific instance of the recently deployed child contract
          individualMarket = market.attach(marketAddress);
        })
          // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
          // could also do assert.fail
          it("Correctly has one market", async () => {
            const numMarkets = await predictionMarketFactory.getNumMarkets()
            assert.equal(numMarkets.toString(), "1")
          })
          
          it("Correctly inherets the right priceFeed", async () => {
            const priceFeed = await individualMarket.getPriceFeed()
            // assert.equal(priceFeed, "0x0000000000000000000000000000000000000002")
            expect(priceFeed.toString()).is.not.equal("0x0000000000000000000000000000000000000000");
          })
          // we could be even more precise here by making sure exactly $50 works
          // but this is good enough for now
          it("Allows entry if you have the right entry fee", async () => {
            await individualMarket.makePrediction(priceGuess, { value: sendValue })
            const response = await individualMarket.getPredictions();
            // console.log(JSON.stringify(response));
            assert.equal(response[0][0], deployer.address);
          })

          it("Correctly sets asset", async () => {
            const response = await individualMarket.getAsset();
            assert.equal(response.toString(), asset);
          })

          it("Correctly sets entry fee", async () => {
            const response = await individualMarket.getEntryFee();
            assert.equal(response.toString(), entryFee);
          })

          it("Prevents entry if you don't have the right entry fee", async () => {
            await expect(individualMarket.makePrediction(priceGuess)).to.be.revertedWith("Market__NotEnoughEth")
          })

          it("Prevents entry if after the predictionCloseTime", async () => {
            // Simulate time moving forward on blockchain
            // At 15:35:00 in Patrick Collins' 32-hour FreeCodeCamp Solidity course on YouTube
            await network.provider.send("evm_increaseTime", [SECONDS_IN_DAY + 1]);
            await network.provider.request({ method: "evm_mine", params: [] });
            await expect(individualMarket.makePrediction(priceGuess, { value: entryFee })).to.be.revertedWith("Market__PredictionsClosed")
          })

          it("Emits an event after prediction is made", async () => {
            await expect(individualMarket.makePrediction(priceGuess, { value: entryFee })).to.emit(
              individualMarket,
              "PredictionMade"
            )
            .withArgs(deployer.address, priceGuess)
          })

          describe("endMarket", () => {
            it("Prevents ending market if end time hasn't been reached", async () => {
              await individualMarket.makePrediction(priceGuess, { value: sendValue })
              await expect(individualMarket.endMarket()).to.be.revertedWith("Market__ExpirationTimeNotReached")
            })

            it("Successfully ends market", async () => {
              let guess = 3000;
              let numGuesses = 20;
              // make three predictions
              individualMarketAsAccountOne = individualMarket.connect(accountOne);
              individualMarketAsAccountTwo = individualMarket.connect(accountTwo);

              for (let i = 0; i < numGuesses; i++) {
                await individualMarketAsAccountOne.makePrediction(guess.toString(), { value: sendValue })
                guess += 500;
              }

              for (let j = 0; j < numGuesses; j++) {
                await individualMarketAsAccountTwo.makePrediction(guess.toString(), { value: sendValue })
                guess += 500
              }

              const startingBalance = await ethers.provider.getBalance(accountTwo.address);

              // increase the time until after market closes
              await network.provider.send("evm_increaseTime", [SECONDS_IN_DAY + 1]);
              await network.provider.request({ method: "evm_mine", params: [] });
      
              await expect(individualMarket.endMarket()).to.emit(
                individualMarket,
                "WinnerChosen"
              )
              .withArgs(accountTwo.address, (sendValue * numGuesses * 2).toString(), 1)

              // Get the user's ending account balance
              const endingBalance = await ethers.provider.getBalance(accountTwo.address);
              
              assert.equal(startingBalance.add(sendValue.mul(numGuesses).mul(2)).toString(), endingBalance.toString());
              
            })
          })
      })
    })
