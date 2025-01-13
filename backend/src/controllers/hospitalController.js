import { JsonRpcProvider, ethers } from "ethers";
import crypto from "crypto";
import hospitalArtifact from "../../artifacts/contracts/Hospital.sol/Hospital.json" assert { type: "json" };
import patientArtifact from "../../artifacts/contracts/Patient.sol/Patient.json" assert { type: "json" };
import doctorArtifact from "../../artifacts/contracts/Doctor.sol/Doctor.json" assert { type: "json" };
import { storeData } from "../../storage/dataService.js";
import {
  generateHash,
  generateRegistrationCode,
  hashDataWithKey,
} from "../../storage/encrypt.js";
const hospitalABI = hospitalArtifact.abi;
const patientABI = patientArtifact.abi;
const doctorABI = doctorArtifact.abi;
// console.log("Hospital Address: ", hospitalAddress);
// Local Hardhat JSON-RPC provider and signer
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const signerPrivateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Replace with one of the private keys from Hardhat
const adminSigner = new ethers.Wallet(signerPrivateKey, provider);

const contractInitializer = async () => {
  // Environment variables for contract addresses
  const hospitalAddress = process.env.HOSPITAL_CONTRACT_ADDRESS;
  const patientAddress = process.env.PATIENT_CONTRACT_ADDRESS;
  const doctorAddress = process.env.DOCTOR_CONTRACT_ADDRESS;
  // Contract instances
  const hospitalContract = new ethers.Contract(
    hospitalAddress,
    hospitalABI,
    adminSigner
  );
  const patientContract = new ethers.Contract(
    patientAddress,
    patientABI,
    adminSigner
  );
  const doctorContract = new ethers.Contract(
    doctorAddress,
    doctorABI,
    adminSigner
  );
  return { hospitalContract, patientContract, doctorContract };
};
// Contract instances
// const hospitalContract = new ethers.Contract(
//   hospitalAddress,
//   hospitalABI,
//   adminSigner
// );
// const patientContract = new ethers.Contract(
//   patientAddress,
//   patientABI,
//   adminSigner
// );
// const doctorContract = new ethers.Contract(
//   doctorAddress,
//   doctorABI,
//   adminSigner
// );

// // Generate a unique hash using the government ID
// function generateHash(govtId) {
//   const dataToHash = `${govtId}$`;
//   const salt = crypto.randomBytes(16).toString("hex"); // Salt for added security
//   const hash = crypto.createHash("sha256");
//   hash.update(dataToHash + salt); // Adding salt to the data before hashing
//   return hash.digest("hex"); // Return the hash
// }

// Register a Doctor
export const registerDoctors = async (req, res) => {
  try {
    // Initialize the contract instances
    const { hospitalContract } = await contractInitializer();
    // Extract doctor data from the request body
    const { email, specialization, govtId, randomWords } = req.body;

    // Input validation
    if (!email || !specialization || !govtId || !randomWords) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Step 1: Generate registration code
    const registrationCode = generateRegistrationCode(); // Generate a 24-character code
    console.log(registrationCode);

    // Step 2: Hash User Data using random words
    const userDataHash = hashDataWithKey({ email, govtId }, randomWords);

    //Step 3: Hash the userDataHash using registration code
    const userUID = hashDataWithKey(userDataHash, registrationCode);

    // Step 4: Store the userUID Hash in IPFS
    const cid = await storeData(userUID);

    // Interact with the Hospital smart contract
    const tx = await hospitalContract.registerDoctor(
      userUID, // Unique user hash
      cid, // CID of the stored data
      specialization // Doctor's specialization
    );

    console.log("Transaction sent:", tx.hash);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log("Transaction confirmed in block:", receipt.blockNumber);

      // Create a Promise that resolves when the DoctorRegistered event is emitted
      const doctorRegisteredPromise = new Promise((resolve, reject) => {
        hospitalContract.once(
          "DoctorRegistered",
          (did, cid, specialization, firstLogin) => {
            console.log(
              `DID: ${did}, CID: ${cid}, Specialization: ${specialization}`
            );
            resolve({ did, cid, specialization, firstLogin }); // Resolve the Promise with event data
          }
        );

        // Optional timeout in case event is not emitted
        setTimeout(
          () => reject(new Error("DoctorRegistered event not received")),
          10000
        ); // 10 seconds timeout
      });

      try {
        // Wait for the DoctorRegistered event
        const eventData = await doctorRegisteredPromise;
        const { did, cid, firstLogin } = eventData;
        // Respond with success, using the received DID and specialization
        return res.status(201).json({
          message: "Doctor registered successfully.",
          transactionHash: tx.hash,
          doctorData: {
            doctorDID: did,
            specialization,
            userUID,
            firstLogin,
          },
        });
      } catch (error) {
        console.error("Error waiting for DoctorRegistered event:", error);
        return res.status(500).json({ error: "Failed to register doctor." });
      }
    } else {
      console.error("Transaction failed:", tx.hash);
      return res
        .status(500)
        .json({ error: "Transaction failed during execution." });
    }
  } catch (error) {
    console.error("Error registering doctor:", error);
    return res
      .status(500)
      .json({ error: "An error occurred during doctor registration." });
  }
};
