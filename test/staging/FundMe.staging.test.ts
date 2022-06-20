/* eslint-disable node/no-missing-import */
import { assert } from "console";
import { BigNumber } from "ethers";
import { getNamedAccounts, ethers, network } from "hardhat";
import { DEVELOPMENT_CHAINS, FUNDME } from "../../constants/constants";
import { FundMe } from "../../typechain";

(DEVELOPMENT_CHAINS.includes(network.name) ? describe.skip : describe)(
  "FundMe",
  function () {
    let deployer: string;
    let fundMe: FundMe;
    const ehtAmount: BigNumber = ethers.utils.parseEther("0.1");
    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer;
      fundMe = await ethers.getContract(FUNDME, deployer);
    });
    it("Should allow people to fund and withdraw", async function () {
      await fundMe.fund({ value: ehtAmount });
      await fundMe.withdraw();
      const finalBalance = await fundMe.provider.getBalance(fundMe.address);
      assert(finalBalance.toString(), "0");
    });
  }
);
