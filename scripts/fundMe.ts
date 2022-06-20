/* eslint-disable node/no-missing-import */
import { ethers, getNamedAccounts } from "hardhat";
import { FUNDME } from "../constants/constants";

async function main() {
  const { deployer } = await getNamedAccounts();
  console.log(deployer);

  const fundMe = await ethers.getContract(FUNDME, deployer);
  console.log(`Got contract FundMe at ${fundMe.address}`);
  console.log("Funding contract...");
  const transactionResponse = await fundMe.fund({
    value: ethers.utils.parseEther("0.1"),
  });
  /* const transactionReceipt = */ await transactionResponse.wait(1);
  console.log("Funded!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
