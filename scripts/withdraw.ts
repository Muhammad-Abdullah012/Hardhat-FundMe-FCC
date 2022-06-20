/* eslint-disable node/no-missing-import */
import { ethers, getNamedAccounts } from "hardhat";
import { FUNDME } from "../constants/constants";

async function main() {
  const deployer = (await getNamedAccounts()).deployer;
  const fundMe = await ethers.getContract(FUNDME, deployer);

  console.log("Withdrawing funds!");
  await fundMe.cheaperWithdraw();
  console.log("Withdrawed all funds!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
