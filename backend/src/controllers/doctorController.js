import {
  JsonRpcProvider,
  ethers,
  hexlify,
  randomBytes,
  keccak256,
  toUtf8Bytes,
} from "ethers";
import crypto, { publicDecrypt } from "crypto";
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

//login doctor
export const loginDoctors = async (req, res) => {
  try {
    // Step 1: Initialize the contract instances
    const { hospitalContract, doctorContract } = await contractInitializer();

    // Step 2: Extract doctor data from the request body
    const { email, govtId, randomWords, registrationCode, did } = req.body;

    // Step 3: Input validation (check for missing fields)
    if (!email || !govtId || !randomWords || !registrationCode || !did) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Step 4: Hash user data using random words (to generate a unique identifier for the user)
    const userDataHash = hashDataWithKey({ email, govtId }, randomWords);

    // Step 5: Hash the userDataHash using registration code (to finalize the user's unique ID)
    const userUID = hashDataWithKey(userDataHash, registrationCode);

    // Step 6: Generate a session key and hash it (session management for login)
    const sessionKey = hexlify(randomBytes(32)); // Generate random 32-byte session key
    const keyHash = keccak256(toUtf8Bytes(sessionKey)); // Hash the session key for secure storage
    const sessionDuration = 10 * 60; // Set session duration to 10 minutes

    console.log("keyHash", keyHash);

    // Step 7: Create a session in the Hospital contract
    try {
      const hospitalSessionTx = await hospitalContract.createSession(
        did,
        userUID,
        keyHash,
        sessionDuration
      );

      // Wait for the transaction to be mined and confirm success
      const hospitalSessionReceipt = await hospitalSessionTx.wait();
      if (hospitalSessionReceipt.status === 1) {
        console.log(
          "Transaction confirmed in block:",
          hospitalSessionReceipt.blockNumber
        );

        // Step 8: Listen for the "SessionCreated" event and resolve after it
        const doctorLoginStatusPromise = new Promise((resolve, reject) => {
          hospitalContract.once(
            "SessionCreated",
            (userDID, expiry, success) => {
              resolve({ userDID, expiry, success });
            }
          );
          // Set a timeout in case the event isn't received within 10 seconds
          setTimeout(
            () => reject(new Error("SessionCreated event not received")),
            10000
          );
        });

        try {
          // Step 9: Wait for the event and extract details
          const eventData = await doctorLoginStatusPromise;
          const { userDID, expiry, success } = eventData;

          console.log("expiry->", expiry, " ", success);

          // Step 10: Proceed based on the success of the session creation
          if (success === true) {
            // Step 11: Validate login in the Hospital contract
            const validateLoginTx = await hospitalContract.validateLogin(
              did,
              userUID,
              keyHash
            );
            const validateLoginReceipt = await validateLoginTx.wait();

            if (validateLoginReceipt.status === 1) {
              console.log(
                "Transaction confirmed in block:",
                validateLoginReceipt.blockNumber
              );

              // Step 12: Listen for the "DoctorLoginStatus" event
              const doctorLoginStatusPromise = new Promise(
                (resolve, reject) => {
                  hospitalContract.once(
                    "DoctorLoginStatus",
                    (did, cid, isFirstLogin, success, message) => {
                      resolve({ did, cid, isFirstLogin, success, message });
                    }
                  );
                  // Timeout in case event is not received
                  setTimeout(
                    () =>
                      reject(new Error("DoctorLoginStatus event not received")),
                    10000
                  );
                }
              );

              try {
                // Step 13: Wait for the event and extract login status
                const eventData = await doctorLoginStatusPromise;
                const { did, cid, isFirstLogin, success, message } = eventData;

                console.log("isFirstLogin", isFirstLogin, " ", success);

                // Step 14: Handle first-time login and other login cases
                if (success === true && isFirstLogin === true) {
                  // Step 15: Generate keys and store them in the blockchain
                  try {
                    const setDoctorPublicKeyTx =
                      await hospitalContract.setDoctorPublicKey(
                        did,
                        "publicKey"
                      );
                    await setDoctorPublicKeyTx.wait();
                    console.log("Public key set in Doctor contract....");

                    // Step 16: Return success response to the client with doctor data
                    return res.status(201).json({
                      message: message,
                      doctorData: {
                        doctorDID: did,
                        userUID,
                        isFirstLogin,
                      },
                    });
                  } catch (error) {
                    console.error("Error setting doctor public key:", error);
                    return res.status(500).json({
                      error: "An error occurred while setting public key.",
                    });
                  }
                } else if (success === true && isFirstLogin === false) {
                  // Step 17: Handle case for subsequent logins
                  console.log("not first login");
                }
              } catch (error) {
                console.error(
                  "Error waiting for DoctorRegistered event:",
                  error
                );
                return res
                  .status(500)
                  .json({ error: "Failed to register doctor." });
              }
            } else {
              console.error("Transaction failed:", validateLoginTx.hash);
              return res
                .status(500)
                .json({ error: "Transaction failed during execution." });
            }
          }
        } catch (error) {
          console.error("Error waiting for DoctorRegistered event:", error);
          return res.status(500).json({ error: "Failed to register doctor." });
        }
      } else {
        console.error("Transaction failed:", hospitalSessionTx.hash);
        return res
          .status(500)
          .json({ error: "Transaction failed during execution." });
      }
      console.log("Session created in Hospital contract.");
    } catch (error) {
      console.error("Error while creating session:", error);
      return res
        .status(500)
        .json({ error: "An error occurred during session creation." });
    }
  } catch (error) {
    console.error("Error registering doctor:", error);
    return res
      .status(500)
      .json({ error: "An error occurred during doctor registration." });
  }
};
