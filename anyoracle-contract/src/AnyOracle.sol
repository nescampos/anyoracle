// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../lib/coprocessor-base-contract/src/CoprocessorAdapter.sol";

contract AnyOracle is CoprocessorAdapter {

    struct AssetPair {
        string baseAsset;
        string quoteAsset;
        uint256 value; 
        uint256 blockNumber;
    }

    struct ResponseAssetPair {
        string from_asset;
        string to_asset;
        uint256 value;
    }

    mapping(bytes32 => AssetPair) public assetPairs;

    event ConversionRateUpdated(string baseAsset, string quoteAsset, uint256 newValue, uint256 blockNumber);


    constructor(address _taskIssuerAddress, bytes32 _machineHash)
        CoprocessorAdapter(_taskIssuerAddress, _machineHash)
    {}

    function _getPairKey(string memory _baseAsset, string memory _quoteAsset) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(_baseAsset, _quoteAsset));
    }

    function runExecution(bytes calldata input) external {
        callCoprocessor(input);
    }

    function handleNotice(bytes32 inputPayloadHash, bytes memory notice ) internal override {
        require(notice.length >= 32, "Invalid notice length");
        ResponseAssetPair memory newPair = abi.decode(notice, (ResponseAssetPair));
        bytes32 pairKey = _getPairKey(newPair.from_asset,newPair.to_asset);
        assetPairs[pairKey] = AssetPair(newPair.from_asset,newPair.to_asset, newPair.value, block.number);
        emit ConversionRateUpdated(newPair.from_asset,newPair.to_asset, newPair.value, block.number);
    }

    function getRate(string memory _baseAsset, string memory _quoteAsset) external view returns (AssetPair memory) {
        bytes32 pairKey = _getPairKey(_baseAsset, _quoteAsset);
        return assetPairs[pairKey];
    }

    


}