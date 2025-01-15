import { JsonRpcProvider, ethers } from "ethers";
import crypto from "crypto";
import hospitalArtifact from "../../artifacts/contracts/Hospital.sol/Hospital.json" assert { type: "json" };
import patientArtifact from "../../artifacts/contracts/Patient.sol/Patient.json" assert { type: "json" };
import doctorArtifact from "../../artifacts/contracts/Doctor.sol/Doctor.json" assert { type: "json" };
import { fetchData, storeData } from "../../storage/dataService.js";
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

    //Step 1: Hash the govtid using randomWords
    const userUID = hashDataWithKey(govtId, "hospital private key"); //govtIdHash

    // //Step 2: Hash the govtid hash again with hospital private key
    // const userUID = hashDataWithKey(govtIdHash, "hospital private key");

    //step 3: Check if the userUID already exist or not
    const exists = await hospitalContract.isUserRegistered(userUID);

    //Step 4: If user already exist then return
    if (exists === true) {
      return res.status(201).json({
        message: "Doctor exist.",
      });
    }
    // Step 5: Generate registration code
    const registrationCode = generateRegistrationCode(); // Generate a 24-character code
    console.log(registrationCode);

    // Step 6: Hash User Data and GovtId using random words
    const userDataHash = hashDataWithKey({ email, govtId }, randomWords);

    //Step 6: Hash the userDataHash and govtIdHash using registration code
    const finalUserDataHash = hashDataWithKey(userDataHash, registrationCode);

    // Step 7: Store the userUID Hash in IPFS
    const cid = await storeData(finalUserDataHash);

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

//register a Patient
export const registerPatients = async (req, res) => {
  try {
    // Initialize the contract instances
    const { hospitalContract } = await contractInitializer();
    // Extract doctor data from the request body
    const {
      govtId,
      name,
      email,
      phoneNumber,
      age,
      address,
      issue,
      isSerious,
      randomWords,
    } = req.body;
    // Input validation
    console.log(
      govtId,
      name,
      email,
      phoneNumber,
      age,
      address,
      issue,
      isSerious,
      randomWords
    );
    if (
      !govtId ||
      !name ||
      !email ||
      !phoneNumber ||
      !age ||
      !isSerious ||
      !address ||
      !issue ||
      !randomWords
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    //Step 1: Hash the govtid using randomWords
    const userUID = hashDataWithKey(govtId, "hospital private key"); //govtIdHash

    // //Step 2: Hash the govtid hash again with hospital private key
    // const userUID = hashDataWithKey(govtIdHash, "hospital private key");

    //step 3: Check if the userUID already exist or not
    const exists = await hospitalContract.isUserRegistered(userUID);

    //Step 4: If user already exist then return
    if (exists === true) {
      return res.status(201).json({
        message: "Doctor exist.",
      });
    }
    // Step 5: Generate registration code
    const registrationCode = generateRegistrationCode(); // Generate a 24-character code
    console.log(registrationCode);

    // Step 6: Hash User data using random words
    const userDataHash = hashDataWithKey(
      { govtId, name, email, phoneNumber, age, address },
      randomWords
    );

    //Step 7: Hash the userDataHash and govtIdHash using registration code
    const finalUserDataHash = hashDataWithKey(userDataHash, registrationCode);

    // Step 8: Store the userUID Hash in IPFS
    const cid = await storeData(finalUserDataHash);

    // Interact with the Hospital smart contract
    const patientRegistrationTx = await hospitalContract.registerPatient(
      userUID, // Unique user hash
      cid, // CID of the stored data
      issue,
      isSerious
    );
    console.log("Transaction sent:", patientRegistrationTx.hash);
    // Wait for the transaction to be mined
    const patientRegistrationReceipt = await patientRegistrationTx.wait();
    if (patientRegistrationReceipt.status === 1) {
      console.log(
        "Transaction confirmed in block:",
        patientRegistrationReceipt.blockNumber
      );

      // Create a Promise that resolves when the DoctorRegistered event is emitted
      const PatientRegisteredPromise = new Promise((resolve, reject) => {
        hospitalContract.once(
          "PatientRegistered",
          (did, cid, firstLogin, assignedDoctorDID, success) => {
            console.log(
              `DID: ${did}, CID: ${cid}, Doctor DID: ${assignedDoctorDID}`
            );
            resolve({ did, cid, firstLogin, assignedDoctorDID, success }); // Resolve the Promise with event data
          }
        );

        // Optional timeout in case event is not emitted
        setTimeout(
          () => reject(new Error("PatientRegistered event not received")),
          10000
        ); // 10 seconds timeout
      });

      try {
        // Wait for the DoctorRegistered event
        const eventData = await PatientRegisteredPromise;
        const { did, cid, firstLogin, assignedDoctorDID, success } = eventData;
        // Respond with success, using the received DID and specialization
        if (success === true) {
          //registration success
          return res.status(201).json({
            message: "Patient registered successfully.",
            transactionHash: patientRegistrationTx.hash,
            PatientData: {
              patientDID: did,
              assignedDoctorDID: assignedDoctorDID,
              firstLogin,
            },
          });
        } else {
          return res.status(201).json({
            message: "An error occured during Patient registration",
            transactionHash: tx.hash,
            success: false,
          });
        }
      } catch (error) {
        console.error("Error waiting for PatientRegistered event:", error);
        return res.status(500).json({ error: "Failed to register patient." });
      }
    } else {
      console.error("Transaction failed:", patientRegistrationTx.hash);
      return res
        .status(500)
        .json({ error: "Transaction failed during execution." });
    }
  } catch (error) {
    console.error("Error registering patient:", error);
    return res
      .status(500)
      .json({ error: "An error occurred during patient registration." });
  }
};
// // Enum mapping on the frontend (JavaScript)
// const issueToSpecialization = {
//   "fever": 0,                // General Medicine
//   "cold": 0,                 // General Medicine
//   "diabetes": 1,             // Endocrinology
//   "hypertension": 1,         // Cardiology
//   "cough": 0,                // General Medicine
//   "headache": 0,             // General Medicine
//   "anxiety": 2,              // Psychiatry
//   "depression": 2,           // Psychiatry
//   "asthma": 3,               // Pulmonology
//   "cancer": 4,               // Oncology
//   "back pain": 5,            // Orthopedics
//   "arthritis": 5,            // Orthopedics
//   "tooth pain": 6,           // Dentistry
//   "ear infection": 7,        // ENT
//   "vision problems": 8,      // Ophthalmology
//   "skin rash": 9,            // Dermatology
//   "hormonal imbalance": 1,   // Endocrinology
//   "gastrointestinal issues": 10, // Gastroenterology
//   "urinary problems": 11,    // Urology
//   "pregnancy": 12,           // Obstetrics and Gynecology
//   "menstrual problems": 12,  // Obstetrics and Gynecology
//   "mental health": 2         // Psychiatry
// };

// // Function to map issue string to enum value
// function getSpecializationEnum(issue) {
//   return issueToSpecialization[issue.toLowerCase()] || -1; // Returns -1 if issue is not found
// }

// // Usage example
// const issue = "fever";  // Example issue input
// const specializationEnum = getSpecializationEnum(issue);

// // Now you can call the contract function with specializationEnum
// console.log(`Specialization Enum for ${issue}: ${specializationEnum}`);
