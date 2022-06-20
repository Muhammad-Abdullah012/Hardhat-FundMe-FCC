// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./PriceConverter.sol";

error FundMe__NotOwner(); //for knowing which contract is throwing error

/**
 * @title A contract for crowd funding
 * @author Muhammad Abdullah
 * @notice This contract is to demonstrate a sample funding contract
 * @dev This contract implements price feeds as library
 */

contract FundMe {
  // Type Declarations
  using PriceConverter for uint256;

  //State Variables
  mapping(address => uint256) private s_addressToAmountFunded;
  address[] private s_funders;

  // Could we make this constant?  /* hint: no! We should make it immutable! */
  address private immutable i_owner;
  uint256 public constant MINIMUM_USD = 50 * 10**18;
  AggregatorV3Interface private immutable i_priceFeed;

  modifier onlyOwner() {
    // require(msg.sender == owner);
    if (msg.sender != i_owner) revert FundMe__NotOwner();
    _;
  }

  /*
    constructor

    receive function (if exists)

    fallback function (if exists)

    external

    public

    internal

    private
  */

  constructor(address priceFeedAddress) {
    i_owner = msg.sender;
    i_priceFeed = AggregatorV3Interface(priceFeedAddress);
  }

  // Explainer from: https://solidity-by-example.org/fallback/
  // Ether is sent to contract
  //      is msg.data empty?
  //          /   \
  //         yes  no
  //         /     \
  //    receive()?  fallback()
  //     /   \
  //   yes   no
  //  /        \
  //receive()  fallback()

  receive() external payable {
    fund();
  }

  fallback() external payable {
    fund();
  }

  function getFunder(uint256 index) public view returns (address) {
    require(index >= 0 && index < s_funders.length, "Index out of bounds");
    return s_funders[index];
  }

  function getFunderLength() public view returns (uint256) {
    return s_funders.length;
  }

  function getOwner() public view returns (address) {
    return i_owner;
  }

  function getPriceFeed() public view returns (AggregatorV3Interface) {
    return i_priceFeed;
  }

  function getAddressToAmountFunded(address funder)
    public
    view
    returns (uint256)
  {
    return s_addressToAmountFunded[funder];
  }

  function fund() public payable {
    require(
      msg.value.getConversionRate(i_priceFeed) >= MINIMUM_USD,
      "You need to spend more ETH!"
    );
    // require(PriceConverter.getConversionRate(msg.value) >= MINIMUM_USD, "You need to spend more ETH!");
    s_addressToAmountFunded[msg.sender] += msg.value;
    s_funders.push(msg.sender);
  }

  function getVersion() public view returns (uint256) {
    // AggregatorV3Interface i_priceFeed = AggregatorV3Interface(
    //   0x8A753747A1Fa494EC906cE90E9f37563A8AF630e
    // );
    return i_priceFeed.version();
  }

  function withdraw() public payable onlyOwner {
    for (
      uint256 funderIndex = 0;
      funderIndex < s_funders.length;
      funderIndex++
    ) {
      address funder = s_funders[funderIndex];
      s_addressToAmountFunded[funder] = 0;
    }
    s_funders = new address[](0);
    // // transfer
    // payable(msg.sender).transfer(address(this).balance);
    // // send
    // bool sendSuccess = payable(msg.sender).send(address(this).balance);
    // require(sendSuccess, "Send failed");
    // call
    (bool callSuccess, ) = payable(msg.sender).call{
      value: address(this).balance
    }("");
    require(callSuccess, "Call failed");
  }

  function cheaperWithdraw() public payable onlyOwner {
    address[] memory funders = s_funders;
    for (uint256 funderIndex = 0; funderIndex < funders.length; ++funderIndex) {
      address funder = funders[funderIndex];
      s_addressToAmountFunded[funder] = 0;
    }
    s_funders = new address[](0);
    (bool callSuccess, ) = i_owner.call{value: address(this).balance}("");
    require(callSuccess, "Call failed");
  }
}

// Concepts we didn't cover yet (will cover in later sections)
// 1. Enum
// 2. Events
// 3. Try / Catch
// 4. Function Selector
// 5. abi.encode / decode
// 6. Hash with keccak256
// 7. Yul / Assembly
