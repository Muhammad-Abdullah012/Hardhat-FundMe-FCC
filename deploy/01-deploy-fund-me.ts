/* eslint-disable node/no-missing-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../helper-hardhat-config";
import { network } from "hardhat";
import { verify } from "../utils/verify";
import {
  DEVELOPMENT_CHAINS,
  FUNDME,
  MOCKV3AGGREGATOR,
  WAIT_CONFIRMATION_BLOCKS,
} from "../constants/constants";

// const deployFunction = () => {
//   console.log("Hi, in deployfunction..");
// };

const fundMeFunction: DeployFunction = async (
  hre: HardhatRuntimeEnvironment
) => {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, log } = hre.deployments;

  const chainId =
    network.config.chainId !== undefined ? network.config.chainId : 0;

  let ethUsdPriceFeedAddress: string; // = networkConfig[chainId].ethUsdPriceFeed;
  let wait: boolean;
  if (DEVELOPMENT_CHAINS.includes(network.name)) {
    ethUsdPriceFeedAddress = (await hre.deployments.get(MOCKV3AGGREGATOR))
      .address;
    wait = false;
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeedAddress;
    wait = true;
  }

  const args = [ethUsdPriceFeedAddress];
  const fundMe = await deploy(FUNDME, {
    contract: FUNDME,
    from: deployer,
    args, // constructor arguments
    log: true,
    waitConfirmations: wait ? WAIT_CONFIRMATION_BLOCKS : undefined,
  });
  if (
    !DEVELOPMENT_CHAINS.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(fundMe.address, args);
  }

  log("---------------------------------");
};

fundMeFunction.tags = ["all"];
export default fundMeFunction;
