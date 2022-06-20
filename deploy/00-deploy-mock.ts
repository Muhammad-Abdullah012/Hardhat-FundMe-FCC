/* eslint-disable node/no-missing-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import {
  DEVELOPMENT_CHAINS,
  DECIMALS,
  INITIAL_ANSWER,
  MOCKV3AGGREGATOR,
} from "../constants/constants";
import { network } from "hardhat";

const mockFunction: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;
  if (DEVELOPMENT_CHAINS.includes(network.name)) {
    log("!..Deploying Mock..!");
    await deploy(MOCKV3AGGREGATOR, {
      contract: MOCKV3AGGREGATOR,
      from: deployer,
      log: true,
      args: [DECIMALS, INITIAL_ANSWER],
    });
    log("Mocks Deployed...");
    log("-------------------------------------------");
  }
};

mockFunction.tags = ["all", "mocks"];
export default mockFunction;
