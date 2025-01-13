// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {console} from "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Doctor {
    struct Session {
        bytes32 keyHash; // Hash of the session key
        uint256 expiry; // Expiry timestamp
    }

    mapping(string => bool) private authorizedDoctors; // Simulated authorized doctor DIDs
    mapping(string => Session) private sessions; // Store session data by userDID

    event DoctorAuthorized(string indexed userDID);
    event SessionValidated(string indexed userDID, bool success);

    // Simulate doctor authorization (for demo purposes)
    function authorizeDoctor(string calldata userDID) external {
        authorizedDoctors[userDID] = true;
        emit DoctorAuthorized(userDID);
    }

    // Set session in Doctor contract
    function setSession(
        string memory userDID,
        bytes32 keyHash,
        uint256 duration
    ) public onlyHospital(msg.sender) returns (bool) {
        require(
            bytes(doctors[userDID].did).length > 0,
            "Doctor does not exists"
        );
        sessions[userDID] = Session({
            keyHash: keyHash,
            expiry: block.timestamp + duration
        });
        return true;
    }

    struct DoctorDetails {
        string did;
        string cid; // CID of the stored data(stored to ipfs)
        string name;
        string specialization;
        bool isFirstLogin; // Whether the doctor is logging in for the first time
        string publicKey; // Public key for encryption
        uint8 assignedPatientsCount;
    }

    mapping(string => DoctorDetails) public doctors;

    modifier onlyHospital(address hospital) {
        require(
            msg.sender == hospital,
            "Unauthorized: Only hospital can add a doctor"
        );
        _;
    }

    // add doctor to the system
    function addDoctor(
        string memory _did,
        string memory _specialization,
        string memory _cid
    ) public onlyHospital(msg.sender) {
        require(bytes(doctors[_did].did).length == 0, "Doctor already exists");

        doctors[_did] = DoctorDetails({
            did: _did,
            cid: _cid,
            name: "",
            specialization: _specialization,
            isFirstLogin: true,
            publicKey: "",
            assignedPatientsCount: 0
        });
    }

    // doctor first login
    // Validate doctor login
    function validateFirstLogin(
        string memory _userDID,
        string memory _cid,
        bytes32 keyHash
    ) public returns (bool, string memory) {
        // Check if doctor exists
        if (bytes(doctors[_userDID].did).length == 0) {
            return (false, "Doctor not found");
        }
        // Verify session
        Session memory session = sessions[_userDID];
        require(session.keyHash == keyHash, "Invalid session key");
        require(block.timestamp <= session.expiry, "Session expired");

        // Check cid
        if (
            keccak256(abi.encodePacked(doctors[_userDID].cid)) ==
            keccak256(abi.encodePacked(_cid))
        ) {
            //make isFirstLogin false
            doctors[_userDID].isFirstLogin = false;
            return (true, "First Login Successful");
        } else {
            return (false, "Invalid Data");
        }
    }

    // Function to set the public key for a doctor
    function setPublicKey(
        string memory _did,
        string memory _publicKey
    ) public returns (bool) {
        require(bytes(doctors[_did].did).length > 0, "Doctor does not exist");
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        //set the public key
        doctors[_did].publicKey = _publicKey;
        return true;
    }
    // // Validate session (called by Hospital contract)
    // function validateSession(
    //     string memory userDID,
    //     bytes32 keyHash
    // ) external returns (bool) {
    //     require(
    //         bytes(doctors[userDID].did).length > 0,
    //         "Doctor does not exists"
    //     );

    //     // Verify session
    //     Session memory session = sessions[userDID];
    //     require(session.keyHash == keyHash, "Invalid session key");
    //     require(block.timestamp <= session.expiry, "Session expired");

    //     emit SessionValidated(userDID, true);
    //     return true;
    // }
    // function findDoctor(
    //     string memory _problem,
    //     bool _isSerious
    // ) public view returns (string memory) {
    //     string memory bestDoctorDID = "";
    //     uint8 leastPatients = 10;

    //     for (uint i = 0; i < doctorDIDs.length; i++) {
    //         DoctorDetails memory doc = doctors[doctorDIDs[i]];

    //         if (
    //             keccak256(abi.encodePacked(doc.specialization)) ==
    //             keccak256(abi.encodePacked(_problem))
    //         ) {
    //             if (_isSerious && doc.assignedPatientsCount == 0) {
    //                 console.log(
    //                     "Doctor assigned with: ",
    //                     doc.did,
    //                     " -> ",
    //                     doc.specialization
    //                 );
    //                 return doc.did;
    //             }
    //             if (doc.assignedPatientsCount < leastPatients) {
    //                 console.log(
    //                     "Doctor assigned with: ",
    //                     doc.did,
    //                     " -> ",
    //                     doc.specialization
    //                 );
    //                 leastPatients = doc.assignedPatientsCount;
    //                 bestDoctorDID = doc.did;
    //             }
    //         }
    //     }
    //     return bestDoctorDID;
    // }

    // function incrementPatientCount(string memory _doctorDID) public {
    //     require(bytes(doctors[_doctorDID].did).length > 0, "Doctor not found");
    //     require(
    //         doctors[_doctorDID].assignedPatientsCount < 10,
    //         "Doctor is fully booked"
    //     );
    //     doctors[_doctorDID].assignedPatientsCount++;
    // }
}
