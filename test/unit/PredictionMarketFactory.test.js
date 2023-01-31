const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("PredictionMarketFactory", function () {
          let predictionMarketFactory
          let mockV3Aggregator
          let deployer
          const sendValue = ethers.utils.parseEther("0.1")
          const SECONDS_IN_DAY = 86400;
          beforeEach(async () => {
              // const accounts = await ethers.getSigners()
              // deployer = accounts[0]
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              predictionMarketFactory = await ethers.getContract("PredictionMarketFactory", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", function () {
              it("sets the owner correctly", async () => {
                  const response = await predictionMarketFactory.getOwner()
                  assert.equal(response.toString(), deployer)
              })
              
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
                deployer,
                asset,
                entryFee,
                predictionCutoffTime.toString(),
                expirationTime.toString()
              )
            })
          })

          describe("eth contract", function () {
            let ethMarket;
            const entryFee = "100000000000000000"; // 0.1
            const asset = 1;
            beforeEach(async () => {
              // const accounts = await ethers.getSigners()
              // deployer = accounts[0]
              const secondsSinceEpoch = Math.floor(new Date() / 1000);
              const predictionCutoffTime = secondsSinceEpoch + (60 * 60);
              const expirationTime = secondsSinceEpoch + (60 * 60 * 2);
              await predictionMarketFactory.createMarket(asset, entryFee, predictionCutoffTime.toString(), expirationTime.toString())

              const ethMarketAddress = await predictionMarketFactory.getMarket("0");

              // create a connection to the generic Market.sol contract
              const market = await ethers.getContractFactory("Market");
              // get the specific instance of the recently deployed child contract
              ethMarket = market.attach(ethMarketAddress);
            })
              // https://ethereum-waffle.readthedocs.io/en/latest/matchers.html
              // could also do assert.fail
              it("Correctly has one market", async () => {
                const numMarkets = await predictionMarketFactory.getNumMarkets()
                assert.equal(numMarkets.toString(), "1")
              })
              
              it("Correctly inherets the right priceFeed", async () => {
                const priceFeed = await ethMarket.getPriceFeed()
                assert.equal(priceFeed.toString(), "0x0000000000000000000000000000000000000002")
              })
              // we could be even more precise here by making sure exactly $50 works
              // but this is good enough for now
              it("Allows entry if you have the right entry fee", async () => {
                  await ethMarket.makePrediction("2500", { value: sendValue })
                  const response = await ethMarket.getNumPlayers();
                  assert.equal(response.toString(), "1")
              })

              it("Correctly sets asset", async () => {
                const response = await ethMarket.getAsset();
                assert.equal(response.toString(), asset);
              })

              it("Correctly sets entry fee", async () => {
                const response = await ethMarket.getEntryFee();
                assert.equal(response.toString(), entryFee);
              })

              it("Prevents entry if you don't have the right entry fee", async () => {
                await expect(ethMarket.makePrediction("2500")).to.be.revertedWith("Market__NotEnoughEth")
              })

              it("Prevents entry if after the predictionCloseTime", async () => {
                // Simulate time moving forward on blockchain
                // At 15:35:00 in Patrick Collins' 32-hour FreeCodeCamp Solidity course on YouTube
                await network.provider.send("evm_increaseTime", [SECONDS_IN_DAY + 1]);
                await network.provider.request({ method: "evm_mine", params: [] });
                await expect(ethMarket.makePrediction("2500", { value: entryFee })).to.be.revertedWith("Market__PredictionsClosed")
              })

              it.only("Prevents entry if you don't have the right entry fee", async () => {
                await expect(ethMarket.makePrediction("2500")).to.be.revertedWith("Market__NotEnoughEth")
              })

              it("Prevents entry if you don't have the right entry fee", async () => {
                await expect(ethMarket.makePrediction("2500")).to.be.revertedWith("Market__NotEnoughEth")
              })
          })
          describe("withdraw", function () {
              beforeEach(async () => {
                  await fundMe.fund({ value: sendValue })
              })
              it("withdraws ETH from a single funder", async () => {
                  // Arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Assert
                  // Maybe clean up to understand the testing
                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
              // this test is overloaded. Ideally we'd split it into multiple tests
              // but for simplicity we left it as one
              it("is allows us to withdraw with multiple funders", async () => {
                  // Arrange
                  const accounts = await ethers.getSigners()
                  for (i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  // Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  // Let's comapre gas costs :)
                  // const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait()
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
                  console.log(`GasCost: ${withdrawGasCost}`)
                  console.log(`GasUsed: ${gasUsed}`)
                  console.log(`GasPrice: ${effectiveGasPrice}`)
                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)
                  // Assert
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(withdrawGasCost).toString()
                  )
                  // Make a getter for storage variables
                  await expect(fundMe.getFunder(0)).to.be.reverted

                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })
              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const fundMeConnectedContract = await fundMe.connect(
                      accounts[1]
                  )
                  await expect(
                      fundMeConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner")
              })
          })
      })
