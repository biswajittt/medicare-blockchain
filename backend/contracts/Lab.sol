// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Lab {
    address public admin;
    address private hospitalContract; // Address of the authorized hospital contract
    struct LabDetails {
        string did;
        address labAddress;
        string specialization;
    }

    mapping(string => LabDetails) public labs;

    modifier onlyHospital() {
        require(
            msg.sender == hospitalContract,
            "Unauthorized: Only hospital can perform this action"
        );
        _;
    }

    constructor() {}

    // Function to set the hospital contract address (only callable once)
    function setHospitalContract(address _hospitalContract) public {
        require(
            hospitalContract == address(0),
            "Hospital contract already set"
        );
        hospitalContract = _hospitalContract;
    }

    function addLab(
        string memory _did,
        address _labAddress
    ) public onlyHospital {
        labs[_did] = LabDetails(_did, _labAddress, "");
    }

    function fetchLab(
        string memory _did
    ) external view returns (LabDetails memory) {
        return labs[_did];
    }
}
