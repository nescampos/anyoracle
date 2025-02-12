// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {AnyOracle} from "../src/AnyOracle.sol";

contract AnyOracleTest is Test {
    AnyOracle public anyoracle;
    address private taskIssuer = address(0x123);
    bytes32 private machineHash = keccak256(abi.encodePacked("test_machine"));

    function setUp() public {
        anyoracle = new AnyOracle(taskIssuer, machineHash);
    }
}
