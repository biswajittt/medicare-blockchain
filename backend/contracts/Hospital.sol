// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./Patient.sol";
import "./Doctor.sol";
// import "erc721a-upgradeable/contracts/ERC721AUpgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";

contract Hospital {
    address public admin; // Hospital admin
    Doctor public doctorContract; // Reference to Doctor contract
    Patient public patientContract;
    //Session structure
    struct Session {
        bytes32 keyHash; // Hash of the session key
        uint256 expiry; // Expiry timestamp
    }
    //DoctorDetails structure
    struct DoctorDetails {
        string did;
        string cid; // CID of the stored data(stored to ipfs)
        string userUID; //  user id
        string publicKey; // Doctor's public key
        bool isFirstLogin; // Whether the doctor is logging in for the first time
        string firstLoginKey;
    }
    mapping(string => Session) private sessions; // Stores session data for users
    mapping(string => bool) private registeredDoctors; // user uid -> bool to check if doctor is already registered or not
    mapping(string => DoctorDetails) public doctors; // DID -> DoctorDetails
    // Store user counts for each type
    mapping(string => uint256) private userCounts; // "DOCTOR", "PATIENT", etc.

    event SessionCreated(string userDID, uint256 expiry, bool success);
    event LoginValidated(string indexed user, bool success);

    event DoctorRegistered(
        string did,
        string cid,
        string specialization,
        bool firstLogin
    );
    event DoctorLoginStatus(
        string did,
        string cid,
        bool isFirstLogin,
        bool success,
        string message
    );

    // mapping(string => PatientDetails) public patients;

    constructor(address _doctorContract) {
        admin = msg.sender;
        doctorContract = Doctor(_doctorContract);
        // patientContract = Patient(_patientContract);
    }

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "Unauthorized: Only admin can perform this action"
        );
        _;
    }

    /* DOCTOR START */
    // register doctor
    function registerDoctor(
        string memory _userUID,
        string memory _cid, // CID of the stored data
        string memory _specialization
    ) public onlyAdmin returns (bool) {
        // Validate that CID is not empty
        require(
            bytes(_cid).length > 0,
            "Validation Error: CID cannot be empty"
        );

        // Check if the doctor is already registered with the same userUID
        require(
            !registeredDoctors[_userUID],
            "Doctor already registered with the same user ID"
        );

        string memory year = getCurrentYear(); // Dynamically get the year
        string memory doctorDID = generateDID("DOCTOR", year);

        try doctorContract.addDoctor(doctorDID, _specialization, _cid) {
            // On success, mark the doctor as registered with the given Govt ID Hash
            registeredDoctors[_userUID] = true;

            // Store the doctor details in the mapping
            doctors[doctorDID] = DoctorDetails({
                did: doctorDID,
                cid: _cid,
                userUID: _userUID,
                publicKey: "",
                isFirstLogin: true,
                firstLoginKey: ""
            });

            // Emit event for off-chain processing
            emit DoctorRegistered(
                doctorDID,
                _cid,
                _specialization,
                doctors[doctorDID].isFirstLogin
            );
            return true;
        } catch {
            // On failure, just return false
            return false;
        }
    }

    // // Check if a doctor is registered
    // function isDoctorRegistered(
    //     string calldata userDID
    // ) public view returns (bool) {
    //     return bytes(doctors[userDID].did).length > 0;
    // }

    //Doctor Login
    // Set a session for login
    function createSession(
        string memory _userDID,
        string memory _userUID,
        bytes32 keyHash,
        uint256 duration
    ) external {
        // Check if the doctor is registered
        require(registeredDoctors[_userUID], "Doctor not registered");
        require(duration > 0, "Invalid session duration");

        sessions[_userDID] = Session({
            keyHash: keyHash,
            expiry: block.timestamp + duration
        });
        console.log("Session expiry->", sessions[_userDID].expiry);
        //set session on doctor contract
        bool success = doctorContract.setSession(_userDID, keyHash, duration);
        if (success == true) {
            //emit event
            emit SessionCreated(_userDID, block.timestamp + duration, true);
        } else {
            //emit event
            emit SessionCreated(_userDID, block.timestamp + duration, false);
        }
    }

    // Verify session validity
    function verifySession(
        string memory userDID,
        bytes32 keyHash
    ) internal view returns (bool) {
        Session memory session = sessions[userDID];
        return session.keyHash == keyHash && block.timestamp <= session.expiry;
    }

    // Validate login via Doctor contract
    function validateLogin(
        string memory _userDID,
        string memory _userUID,
        bytes32 _keyHash
    ) public onlyAdmin returns (bool) {
        // Check if the doctor is registered
        require(registeredDoctors[_userUID], "Doctor not registered");

        // Verify session validity
        require(
            verifySession(_userDID, _keyHash),
            "Invalid or expired session"
        );
        string memory cid = doctors[_userDID].cid;
        //check first login or not
        if (doctors[_userDID].isFirstLogin == true) {
            // Interact with the Doctor contract for further validation
            (bool success, string memory message) = doctorContract
                .validateFirstLogin(_userDID, cid, _keyHash);
            if (success == true) {
                //emit event
                emit DoctorLoginStatus(_userDID, cid, true, true, message);
                //set first login false
                doctors[_userDID].isFirstLogin = false;
                return true;
            } else {
                //emit event
                emit DoctorLoginStatus(_userDID, cid, true, false, message);
                return false;
            }
        } else {
            //emit event
            emit DoctorLoginStatus(
                _userDID,
                cid,
                false,
                false,
                "An error occured"
            );
            return false;
            // // Interact with the Doctor contract for further validation
            // (bool success, bytes memory data) = doctorContract.call(
            //     abi.encodeWithSignature(
            //         "validateSession(string,bytes32)",
            //         _userDID,
            //         keyHash
            //     )
            // );
            // require(success, "Doctor contract call failed");

            // bool validationSuccess = abi.decode(data, (bool));
            // emit LoginValidated(_userDID, validationSuccess);
            // return validationSuccess;
        }
    }

    // Event to log the public key update
    event PublicKeyUpdated(string did, string publicKey, bool success);

    // Function to set the public key for a doctor
    function setDoctorPublicKey(
        string memory _did,
        string memory _publicKey
    ) public onlyAdmin returns (bool) {
        require(bytes(doctors[_did].did).length > 0, "Doctor does not exist");
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        //set doctor public key
        doctors[_did].publicKey = _publicKey;
        bool success = doctorContract.setPublicKey(_did, _publicKey);
        if (success == true) {
            emit PublicKeyUpdated(_did, _publicKey, true);
            return true;
        } else {
            emit PublicKeyUpdated(_did, _publicKey, false);
            return false;
        }
    }

    // // Check login status of the doctor
    // function checkLoginStatus(
    //     string memory _userUID,
    //     string memory _did
    // ) public onlyAdmin {
    //     // Check if the doctor is registered
    //     require(registeredDoctors[_userUID], "Doctor not registered");

    //     // Find the doctor by their UID
    //     DoctorDetails storage doctor = doctors[_did];

    //     // Emit event for off-chain processing
    //     emit DoctorLoginStatus(
    //         doctor.did,
    //         doctor.cid,
    //         doctor.isFirstLogin,
    //         true,
    //         "Fetch Successful"
    //     );
    // }

    // //handle doctor first login
    // // Function to login doctor
    // function loginDoctor(
    //     string memory _userUID,
    //     string memory _did
    // ) public onlyAdmin returns (bool) {
    //     // Check if doctor is registered
    //     require(registeredDoctors[_userUID], "Doctor is not registered");

    //     // Get doctor DID, cid , first login
    //     string memory doctorDID = doctors[_did].did;
    //     string memory cid = doctors[_did].cid;
    //     bool firstLogin = doctors[_did].isFirstLogin;
    //     // Interact with Doctor contract for validation
    //     //for first login
    //     if (firstLogin == true) {
    //         (bool success, string memory message) = doctorContract
    //             .validateFirstLogin(doctorDID, cid);
    //         if (success == true) {
    //             //generate first login session key

    //             // Emit event based on the login status
    //             emit DoctorLoginStatus(doctorDID, cid, false, true, message);
    //             //make isFirstLogin false
    //             doctors[_userUID].isFirstLogin = false;
    //             return true;
    //         } else {
    //             // Emit event based on the login status
    //             emit DoctorLoginStatus(doctorDID, cid, true, false, message);
    //             return false;
    //         }
    //     } else {
    //         return false;
    //     }
    //     // (bool success, string memory message) = doctorContract
    //     //     .validateFirstLogin(doctorDID, cid);
    //     // if (success == true) {
    //     //     //make isFirstLogin false
    //     //     doctors[_userUID].isFirstLogin = false;
    //     //     // Emit event based on the login status
    //     //     emit DoctorLoginStatus(doctorDID, cid, false, true, message);
    //     //     return true;
    //     // } else {
    //     //     // Emit event based on the login status
    //     //     emit DoctorLoginStatus(doctorDID, cid, true, false, message);
    //     //     return false;
    //     // }
    // }

    function getCurrentYear() public view returns (string memory) {
        // Calculate the current year from the timestamp
        uint16 year = uint16(1970 + (block.timestamp / 31556926)); // 31556926 = average seconds in a year
        return uint2str(year);
    }

    // Fetch doctor details by DID
    function getDoctorDetailsByDID(
        string memory _did
    ) public view onlyAdmin returns (DoctorDetails memory) {
        return doctors[_did];
    }

    /* DOCTOR END */

    // /* PATIENT */
    // // Register a new patient
    // function registerPatient(
    //     string memory _name,
    //     string memory _email,
    //     string memory _phoneNumber,
    //     string memory _problem,
    //     bool _isSerious,
    //     string memory _accountCreationYear
    // ) public onlyAdmin returns (bool) {
    //     string memory patientDID = generateDID("PATIENT", _accountCreationYear);
    //     console.log("patientDID-> ", patientDID);
    //     try doctorContract.findDoctor(_problem, _isSerious) returns (
    //         string memory assignedDoctorDID
    //     ) {
    //         require(
    //             bytes(assignedDoctorDID).length > 0,
    //             "No suitable doctor found"
    //         );

    //         try doctorContract.incrementPatientCount(assignedDoctorDID) {
    //             try
    //                 patientContract.addPatient(
    //                     patientDID,
    //                     _name,
    //                     _email,
    //                     _phoneNumber,
    //                     _problem,
    //                     assignedDoctorDID,
    //                     _isSerious
    //                 )
    //             {
    //                 return true;
    //             } catch {
    //                 return false;
    //             }
    //         } catch {
    //             return false;
    //         }
    //     } catch {
    //         return false;
    //     }
    // }

    // // Fetch patient details by DID
    // function getPatientDetails(
    //     string memory _patientDID
    // )
    //     public
    //     view
    //     onlyAdmin
    //     returns (
    //         string memory name,
    //         string memory email,
    //         string memory phoneNumber,
    //         string memory problem,
    //         string memory assignedDoctorDID,
    //         bool isSerious
    //     )
    // {
    //     (
    //         name,
    //         email,
    //         phoneNumber,
    //         problem,
    //         assignedDoctorDID,
    //         isSerious
    //     ) = patientContract.getPatientByDID(_patientDID);

    //     return (
    //         name,
    //         email,
    //         phoneNumber,
    //         problem,
    //         assignedDoctorDID,
    //         isSerious
    //     );
    // }

    // Generate a unique DID
    // Generate a unique DID
    // Function to generate a unique DID
    // Function to generate a unique DID
    function generateDID(
        string memory userType,
        string memory year
    ) public returns (string memory) {
        // Increment the user count for the given user type
        userCounts[userType]++;
        // console.log("userCounts[userType]-> ", userCounts[userType]);

        // Get the user count for the given user type
        uint256 userCount = userCounts[userType];

        // Construct the DID string in the format "Year:DID:UserType:UserCount"
        string memory did = string(
            abi.encodePacked(year, ":DID:", userType, ":", uint2str(userCount))
        );
        return did;
    }

    // Helper function to convert uint to string
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + (j % 10)));
            j /= 10;
        }
        return string(bstr);
    }
}
