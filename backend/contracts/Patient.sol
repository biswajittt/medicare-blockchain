// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Patient {
    //PatientDetails structure
    struct PatientDetails {
        string did;
        string userUID; //  user id
        string cid; // CID of the stored data(stored to ipfs)
        string issue;
        string publicKey; // Doctor's public key
        bool isFirstLogin; // Whether the doctor is logging in for the first time
        string firstLoginKey;
        bool isSerious;
        string assignedDoctorDID;
    }

    mapping(string => PatientDetails) public patients;

    function addPatient(
        string memory _did,
        string memory _userUID,
        string memory _cid,
        string memory _issue,
        string memory _assignedDoctorDID,
        bool _isSerious
    ) public returns (bool) {
        require(
            bytes(patients[_did].did).length == 0,
            "Patient already exists"
        );
        patients[_did] = PatientDetails(
            _did,
            _userUID,
            _cid,
            _issue,
            "",
            true,
            "",
            _isSerious,
            _assignedDoctorDID
        );
        return true;
    }

    // // Get patient details by DID (called by Hospital contract)
    // function getPatientByDID(
    //     string memory _patientDID
    // )
    //     public
    //     view
    //     returns (
    //         string memory name,
    //         string memory email,
    //         string memory phoneNumber,
    //         string memory problem,
    //         string memory assignedDoctorDID,
    //         bool isSerious
    //     )
    // {
    //     PatientDetails storage patient = patients[_patientDID];
    //     return (
    //         patient.name,
    //         patient.email,
    //         patient.phoneNumber,
    //         patient.problem,
    //         patient.assignedDoctorDID,
    //         patient.isSerious
    //     );
    // }
}
