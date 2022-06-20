/* eslint-disable node/no-missing-import */
import { BigNumber, Contract, ContractTransaction } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { assert, expect } from "chai";

import {
  MOCKV3AGGREGATOR,
  FUNDME,
  DEVELOPMENT_CHAINS,
} from "../../constants/constants";
import { FundMe } from "../../typechain";

const fundFromAllAccounts = async (
  fundMe: Contract,
  ehtAmount: BigNumber
): Promise<void> => {
  const accounts = await ethers.getSigners();
  for (let i = 1; i < 20; ++i) {
    const fundMeConnectedContract = fundMe.connect(accounts[i]);
    await fundMeConnectedContract.fund({ value: ehtAmount });
  }
  // accounts.slice(1).forEach(async (acc) => {
  //   const fundMeConnectedContract = fundMe.connect(acc);
  //   await fundMeConnectedContract.fund({
  //     value: ehtAmount,
  //   });
  // }); This is causing tests to fail....
};

const getGasCost = async (
  transactionResponse: ContractTransaction
): Promise<BigNumber> => {
  const { gasUsed, effectiveGasPrice } = await transactionResponse.wait(1);
  return gasUsed.mul(effectiveGasPrice);
};

(DEVELOPMENT_CHAINS.includes(network.name) ? describe : describe.skip)(
  `Contract ${FUNDME}`,
  function () {
    let fundMe: FundMe;
    let deployer: string;
    let mockV3Aggregator: Contract;
    const ehtAmount = ethers.utils.parseEther("1");
    beforeEach(async function () {
      // Deploy here
      deployer = (await getNamedAccounts()).deployer;
      await deployments.fixture(["all"]);
      fundMe = await ethers.getContract(FUNDME, deployer);

      mockV3Aggregator = await ethers.getContract(MOCKV3AGGREGATOR, deployer);
    });

    describe("constructor", function () {
      it("Should set aggregator address correctly", async () => {
        const response = await fundMe.getPriceFeed();
        assert(response, mockV3Aggregator.address);
      });
      it("Should set correct owner", async () => {
        const response = await fundMe.getOwner();
        assert(response, deployer);
      });
    });

    describe("fund", function () {
      it("Should fail if not sent enough ETH", async function () {
        await expect(fundMe.fund()).to.be.revertedWith(
          "You need to spend more ETH!"
        );
      });
      it("Should update s_addressToAmount map", async function () {
        await fundMe.fund({ value: ehtAmount });
        let response = await fundMe.getAddressToAmountFunded(deployer);
        assert.equal(response.toString(), ehtAmount.toString()); // equal to 1

        let ethValue = ethers.utils.parseEther("2");

        await fundMe.fund({ value: ehtAmount });
        response = await fundMe.getAddressToAmountFunded(deployer);
        assert.equal(response.toString(), ethValue.toString()); // equal to 2

        ethValue = ethers.utils.parseEther("3");

        await fundMe.fund({ value: ehtAmount });
        response = await fundMe.getAddressToAmountFunded(deployer);
        assert(response.toString(), ethValue.toString()); // equal to 3
      });

      it("Should add funder to funders array", async function () {
        await fundMe.fund({ value: ehtAmount });
        const funder = fundMe.getFunder(
          (await fundMe.getFunderLength()).sub("1").toString()
        );
        assert(funder, deployer);
      });
      it("Should correctly add all funders to funders array", async function () {
        const accounts = await ethers.getSigners();
        for (let i = 1; i < 20; ++i) {
          const fundMeConnectedContract = fundMe.connect(accounts[i]);
          await fundMeConnectedContract.fund({ value: ehtAmount });
          const funder = fundMe.getFunder(
            (await fundMe.getFunderLength()).sub("1").toString()
          );
          assert(funder, accounts[i].address);
        }
      });
      it("Should revert while accessing out of bounds value in array", async function () {
        expect(fundMe.getFunder(-1)).to.be.revertedWith("Index out of bounds");
        expect(
          fundMe.getFunder(await fundMe.getFunderLength())
        ).to.be.revertedWith("Index out of bounds");
      });
    });

    describe("withdraw", function () {
      beforeEach(async function () {
        await fundMe.fund({ value: ehtAmount });
      });
      it("Should withdraw all funds", async function () {
        const beforeFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const deployerBalanceBefore = await fundMe.provider.getBalance(
          deployer
        );

        const transactionResponse = await fundMe.withdraw();

        const gasCost = await getGasCost(transactionResponse);

        const afterFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const afterDeployerBalance = await fundMe.provider.getBalance(deployer);

        assert.equal(afterFundMeBalance.toString(), "0");
        assert.equal(
          beforeFundMeBalance.add(deployerBalanceBefore).toString(),
          afterDeployerBalance.add(gasCost).toString()
        );
      });

      it("Should allow us withdraw with multiple funders", async function () {
        await fundFromAllAccounts(fundMe, ehtAmount);
        const startingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const startingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        );
        const transactionResponse = await fundMe.withdraw();

        const gasCost = await getGasCost(transactionResponse);

        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const endingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        );
        assert.equal(
          startingFundMeBalance.add(startingDeployerBalance).toString(),
          endingDeployerBalance.add(gasCost).toString()
        );
        assert.equal(endingFundMeBalance.toString(), "0");
        assert.equal((await fundMe.getFunderLength()).toString(), "0");
        expect(fundMe.getFunder(0)).to.be.revertedWith("Index out of bounds");
        {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 20; ++i) {
            assert.equal(
              (
                await fundMe.getAddressToAmountFunded(accounts[i].address)
              ).toString(),
              "0"
            );
          }
        }
      });
      it("Should only allow owner to withdraw funds", async function () {
        beforeEach(async () => {
          await fundMe.fund({ value: ehtAmount });
        });
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];
        const AttackerConnectedAccount = await fundMe.connect(attacker);
        await expect(AttackerConnectedAccount.withdraw()).to.be.revertedWith(
          "FundMe__NotOwner"
        );
      });

      it("Should withdraw all funds, using cheaperWithdraw", async function () {
        const beforeFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const deployerBalanceBefore = await fundMe.provider.getBalance(
          deployer
        );

        const transactionResponse = await fundMe.cheaperWithdraw();

        const gasCost = await getGasCost(transactionResponse);

        const afterFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const afterDeployerBalance = await fundMe.provider.getBalance(deployer);

        assert.equal(afterFundMeBalance.toString(), "0");
        assert.equal(
          beforeFundMeBalance.add(deployerBalanceBefore).toString(),
          afterDeployerBalance.add(gasCost).toString()
        );
      });

      it("Should allow us withdraw with multiple funders, using cheaperWithdraw", async function () {
        await fundFromAllAccounts(fundMe, ehtAmount);
        const startingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const startingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        );
        const transactionResponse = await fundMe.cheaperWithdraw();

        const gasCost = await getGasCost(transactionResponse);

        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const endingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        );
        assert.equal(
          startingFundMeBalance.add(startingDeployerBalance).toString(),
          endingDeployerBalance.add(gasCost).toString()
        );
        assert.equal(endingFundMeBalance.toString(), "0");
        assert.equal((await fundMe.getFunderLength()).toString(), "0");
        expect(fundMe.getFunder(0)).to.be.revertedWith("Index out of bounds");
        {
          const accounts = await ethers.getSigners();
          for (let i = 1; i < 20; ++i) {
            assert.equal(
              (
                await fundMe.getAddressToAmountFunded(accounts[i].address)
              ).toString(),
              "0"
            );
          }
        }
      });
    });
  }
);
