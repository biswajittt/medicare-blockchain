const { JsonRpcProvider, ethers } = require("ethers");
const crypto = require("crypto");
const hospitalArtifact = require("../artifacts/contracts/Hospital.sol/Hospital.json");
const patientArtifact = require("../artifacts/contracts/Patient.sol/Patient.json");
const doctorArtifact = require("../artifacts/contracts/Doctor.sol/Doctor.json");

const hospitalABI = hospitalArtifact.abi;
const patientABI = patientArtifact.abi;
const doctorABI = doctorArtifact.abi;
require("dotenv").config({ path: "../.env" }); // Adjust the path to your .env file

// Now you can use these ABIs with ethers.js

// Environment variables for contract addresses
const hospitalAddress = process.env.HOSPITAL_CONTRACT_ADDRESS;
const patientAddress = process.env.PATIENT_CONTRACT_ADDRESS;
const doctorAddress = process.env.DOCTOR_CONTRACT_ADDRESS;

// Local Hardhat JSON-RPC provider and signer
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const signerPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Replace with one of the private keys from Hardhat
const adminSigner = new ethers.Wallet(signerPrivateKey, provider);

// Contract instances
const hospitalContract = new ethers.Contract(
  hospitalAddress,
  hospitalABI,
  adminSigner
);
async function main() {
  const tx = await hospitalContract.registerDoctor(
    "Dr. Smith", // name
    "Cardiology", // specialization
    "hash", // hash
    "key", // key
    "random" // encrypted hash of user data
  );
  console.log("Transaction sent:", tx.hash);

  // Wait for the transaction to be mined
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Listen to the DoctorRegistered event
  hospitalContract.on("DoctorRegistered", (did, name, specialization) => {
    console.log(`Doctor Registered: ${did}, ${name}, ${specialization}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
