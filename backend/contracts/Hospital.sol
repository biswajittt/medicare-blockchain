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
    // Enum for specialization
    enum Specialization {
        GeneralMedicine, // 0
        Endocrinology, // 1
        Psychiatry, // 2
        Pulmonology, // 3
        Oncology, // 4
        Orthopedics, // 5
        Dentistry, // 6
        ENT, // 7
        Ophthalmology, // 8
        Dermatology, // 9
        Gastroenterology, // 10
        Urology, // 11
        ObstetricsGynecology // 12
    }
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
        Specialization specialization; // Doctor's specialization as enum
        string publicKey; // Doctor's public key
        bool isFirstLogin; // Whether the doctor is logging in for the first time
        string firstLoginKey;
        uint8 assignedPatientsCount;
    }
    //PatientDetails structure
    struct PatientDetails {
        string did;
        string cid; // CID of the stored data(stored to ipfs)
        string userUID; //  user id
        string issue;
        string publicKey; // Doctor's public key
        bool isFirstLogin; // Whether the doctor is logging in for the first time
        string firstLoginKey;
        bool isSerious;
        string assignedDoctorDID;
    }
    // Mapping to store issues corresponding to each specialization
    mapping(Specialization => string[]) public specializationToIssues;
    mapping(string => Session) private sessions; // Stores session data for users
    mapping(string => bool) private registeredUsers;
    mapping(string => bool) private registeredDoctors; // user uid -> bool to check if doctor is already registered or not
    mapping(string => bool) private registeredPatients; // user uid -> bool to check if patient is already registered or not
    mapping(string => DoctorDetails) public doctors; // DID -> DoctorDetails
    // Mapping to store specialization to doctors
    mapping(Specialization => DoctorDetails[]) public specializationToDoctors;
    mapping(string => PatientDetails) public patients; // DID -> PatientDetails
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
    event PatientRegistered(
        string did,
        string cid,
        bool firstLogin,
        string assignedDoctorDID,
        bool success
    );
    event DoctorLoginStatus(
        string did,
        string cid,
        bool isFirstLogin,
        bool success,
        string message
    );

    // mapping(string => PatientDetails) public patients;

    constructor(address _doctorContract, address _patientContract) {
        admin = msg.sender;
        doctorContract = Doctor(_doctorContract);
        patientContract = Patient(_patientContract);
        // Example: Assign issues to Specializations
        specializationToIssues[Specialization.GeneralMedicine] = [
            "fever",
            "cold",
            "headache",
            "cough"
        ];
        specializationToIssues[Specialization.Endocrinology] = [
            "diabetes",
            "hormonal imbalance"
        ];
        specializationToIssues[Specialization.Pulmonology] = ["asthma"];
        specializationToIssues[Specialization.Oncology] = ["cancer"];
        specializationToIssues[Specialization.Orthopedics] = [
            "back pain",
            "arthritis"
        ];
        specializationToIssues[Specialization.Dentistry] = ["tooth pain"];
        specializationToIssues[Specialization.ENT] = ["ear infection"];
        specializationToIssues[Specialization.Ophthalmology] = [
            "vision problems"
        ];
        specializationToIssues[Specialization.Dermatology] = ["skin rash"];
        specializationToIssues[Specialization.Gastroenterology] = [
            "gastrointestinal issues"
        ];
        specializationToIssues[Specialization.Urology] = ["urinary problems"];
        specializationToIssues[Specialization.ObstetricsGynecology] = [
            "pregnancy",
            "menstrual problems"
        ];
        specializationToIssues[Specialization.Psychiatry] = [
            "anxiety",
            "depression",
            "mental health"
        ];
    }

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "Unauthorized: Only admin can perform this action"
        );
        _;
    }

    // Function to check if a user exists (public view)
    function isUserRegistered(
        string memory userUID
    ) public view returns (bool) {
        return registeredUsers[userUID];
    }

    /* DOCTOR START */
    // Function to convert string specialization to enum
    function stringToSpecialization(
        string memory _specialization
    ) internal pure returns (Specialization) {
        if (
            keccak256(bytes(_specialization)) ==
            keccak256(bytes("General Medicine"))
        ) {
            return Specialization.GeneralMedicine;
        } else if (
            keccak256(bytes(_specialization)) ==
            keccak256(bytes("Endocrinology"))
        ) {
            return Specialization.Endocrinology;
        } else if (
            keccak256(bytes(_specialization)) == keccak256(bytes("Psychiatry"))
        ) {
            return Specialization.Psychiatry;
        } else if (
            keccak256(bytes(_specialization)) == keccak256(bytes("Pulmonology"))
        ) {
            return Specialization.Pulmonology;
        } else if (
            keccak256(bytes(_specialization)) == keccak256(bytes("Oncology"))
        ) {
            return Specialization.Oncology;
        } else if (
            keccak256(bytes(_specialization)) == keccak256(bytes("Orthopedics"))
        ) {
            return Specialization.Orthopedics;
        } else if (
            keccak256(bytes(_specialization)) == keccak256(bytes("Dentistry"))
        ) {
            return Specialization.Dentistry;
        } else if (
            keccak256(bytes(_specialization)) == keccak256(bytes("ENT"))
        ) {
            return Specialization.ENT;
        } else if (
            keccak256(bytes(_specialization)) ==
            keccak256(bytes("Ophthalmology"))
        ) {
            return Specialization.Ophthalmology;
        } else if (
            keccak256(bytes(_specialization)) == keccak256(bytes("Dermatology"))
        ) {
            return Specialization.Dermatology;
        } else if (
            keccak256(bytes(_specialization)) ==
            keccak256(bytes("Gastroenterology"))
        ) {
            return Specialization.Gastroenterology;
        } else if (
            keccak256(bytes(_specialization)) == keccak256(bytes("Urology"))
        ) {
            return Specialization.Urology;
        } else {
            revert("Specialization not found");
        }
    }

    // register doctor
    function registerDoctor(
        string memory _userUID,
        string memory _cid, // CID of the stored data
        string memory _specialization
    ) public onlyAdmin returns (bool) {
        // Check if the doctor is already registered with the same userUID
        require(
            !registeredUsers[_userUID],
            "Doctor already registered with the same user UID"
        );
        // Validate that CID is not empty
        require(
            bytes(_cid).length > 0,
            "Validation Error: CID cannot be empty"
        );

        // Convert specialization string to enum (you can also use a mapping like above if needed)
        Specialization specializationEnum = stringToSpecialization(
            _specialization
        );
        string memory year = getCurrentYear(); // Dynamically get the year
        string memory doctorDID = generateDID("DOCTOR", year);

        try doctorContract.addDoctor(doctorDID, _specialization, _cid) {
            // On success, mark the doctor as registered with the given Govt ID Hash
            registeredUsers[_userUID] = true;

            // Store the doctor details in the mapping
            doctors[doctorDID] = DoctorDetails({
                did: doctorDID,
                cid: _cid,
                userUID: _userUID,
                specialization: specializationEnum, // Store the specialization enum
                publicKey: "",
                isFirstLogin: true,
                firstLoginKey: "",
                assignedPatientsCount: 0
            });

            // Add the doctor to the array for the given specialization
            specializationToDoctors[specializationEnum].push(
                doctors[doctorDID]
            );

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
        require(registeredUsers[_userUID], "Doctor not registered");
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
        require(registeredUsers[_userUID], "Doctor not registered");

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

    /* PATIENT */
    // Function to get specialization by issue (No event, only return specialization)
    function getSpecializationByIssue(
        string memory issue
    ) internal view returns (Specialization) {
        for (
            uint256 i = 0;
            i <= uint256(Specialization.ObstetricsGynecology);
            i++
        ) {
            Specialization currentSpecialization = Specialization(i);
            string[] memory issues = specializationToIssues[
                currentSpecialization
            ];

            for (uint256 j = 0; j < issues.length; j++) {
                if (keccak256(bytes(issues[j])) == keccak256(bytes(issue))) {
                    return currentSpecialization; // Return the matching specialization
                }
            }
        }

        revert("Issue not found in any specialization");
    }

    // Register a new patient
    function registerPatient(
        string memory _userUID,
        string memory _cid, // CID of the stored data
        string memory _issue,
        bool _isSerious
    ) public onlyAdmin returns (bool) {
        // Check if the doctor is already registered with the same userUID
        require(
            !registeredUsers[_userUID],
            "Patient already registered with the same user UID"
        );
        string memory year = getCurrentYear(); // Dynamically get the year
        string memory patientDID = generateDID("PATIENT", year);
        console.log("patientDID-> ", patientDID);

        //search the specialization by issue
        Specialization specialization = getSpecializationByIssue(_issue);

        //check doctor available with the specialization
        //assign doctor with minimum or 0 patient assign
        // Find the available doctor for this specialization
        DoctorDetails memory assignedDoctor = findAvailableDoctor(
            specialization
        );
        console.log("assignedDoctor->", assignedDoctor.did);
        // add patient to patient contrcat
        bool success = patientContract.addPatient(
            patientDID,
            _userUID,
            _cid,
            _issue,
            assignedDoctor.did,
            _isSerious
        );
        //mark the assgined dodctor did to paitient details
        if (success == true) {
            registeredUsers[_userUID] = true;
            patients[patientDID] = PatientDetails({
                did: patientDID,
                cid: _cid,
                userUID: _userUID,
                issue: _issue,
                publicKey: "",
                isFirstLogin: true,
                firstLoginKey: "",
                isSerious: _isSerious,
                assignedDoctorDID: assignedDoctor.did
            });
            //emit the event
            emit PatientRegistered(
                patientDID,
                _cid,
                true,
                assignedDoctor.did,
                true
            );
            return true;
        } else {
            //emit the event
            emit PatientRegistered(
                patientDID,
                _cid,
                true,
                assignedDoctor.did,
                false
            );
            return false;
        }
    }

    // Function to find the available doctor with the least assigned patients
    function findAvailableDoctor(
        Specialization specialization
    ) public returns (DoctorDetails memory) {
        // Get the list of doctors for the given specialization
        DoctorDetails[] storage doctorsDetails = specializationToDoctors[
            specialization
        ];

        // Check if there are any doctors available in this specialization
        require(
            doctorsDetails.length > 0,
            "No doctors available for this specialization"
        );

        // Find the doctor with the least assigned patients
        uint256 minAssignedPatients = type(uint256).max;
        uint256 selectedDoctorIndex = 0;

        for (uint256 i = 0; i < doctorsDetails.length; i++) {
            if (doctorsDetails[i].assignedPatientsCount < minAssignedPatients) {
                minAssignedPatients = doctorsDetails[i].assignedPatientsCount;
                selectedDoctorIndex = i;
            }
        }

        // Get the selected doctor
        DoctorDetails memory selectedDoctor = doctorsDetails[
            selectedDoctorIndex
        ];

        // Increment the assignedPatientsCount for the selected doctor
        doctorsDetails[selectedDoctorIndex].assignedPatientsCount += 1;

        return selectedDoctor;
    }

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
