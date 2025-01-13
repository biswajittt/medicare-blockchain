// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Patient {
    struct PatientDetails {
        string did;
        string name;
        string email;
        string phoneNumber;
        string problem;
        string assignedDoctorDID;
        bool isSerious;
    }

    mapping(string => PatientDetails) public patients;

    function addPatient(
        string memory _did,
        string memory _name,
        string memory _email,
        string memory _phoneNumber,
        string memory _problem,
        string memory _assignedDoctorDID,
        bool _isSerious
    ) public {
        require(
            bytes(patients[_did].did).length == 0,
            "Patient already exists"
        );
        patients[_did] = PatientDetails(
            _did,
            _name,
            _email,
            _phoneNumber,
            _problem,
            _assignedDoctorDID,
            _isSerious
        );
    }

    // Get patient details by DID (called by Hospital contract)
    function getPatientByDID(
        string memory _patientDID
    )
        public
        view
        returns (
            string memory name,
            string memory email,
            string memory phoneNumber,
            string memory problem,
            string memory assignedDoctorDID,
            bool isSerious
        )
    {
        PatientDetails storage patient = patients[_patientDID];
        return (
            patient.name,
            patient.email,
            patient.phoneNumber,
            patient.problem,
            patient.assignedDoctorDID,
            patient.isSerious
        );
    }
}
