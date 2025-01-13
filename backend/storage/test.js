import "./customEventPolyfill.js";
import { generateKeyPair, encryptData, decryptData } from "./encrypt.js";
import { storeData, fetchData, removeData, modifyData } from "./dataService.js"; // Assuming these functions are available from your service

const testEncryption = async () => {
  try {
    // Step 1: Generate RSA keys
    const { publicKey, privateKey } = generateKeyPair();
    // console.log("Public Key: ", publicKey);
    // console.log("Private Key: ", privateKey);

    // Step 2: Encrypt some data
    const dataToEncrypt = {
      userId: "12345",
      name: "John Doe",
      email: "old.email@example.com",
    };
    const encryptedData = encryptData(dataToEncrypt, publicKey);
    console.log("Encrypted Data: ", encryptedData);

    // // Step 3: Decrypt the data back
    // const decryptedData = decryptData(encryptedData, privateKey);
    // console.log("Decrypted Data: ", decryptedData);

    // Step 4: Store encrypted data in Helia (as an example)
    const cid = await storeData(encryptedData);
    console.log("Data stored in Helia with CID: ", cid);

    // Step 5: Fetch data from Helia using CID
    const fetchedData = await fetchData(cid);
    console.log("Fetched Data: ", fetchedData);

    // Decrypt the fetched data
    const decryptedData = decryptData(fetchedData, privateKey);
    console.log("Decrypted Data: ", decryptedData);

    // Example of modifying the data (for testing)
    const updatedData = { ...decryptedData, email: "new.email@example.com" };
    const updatedCid = await modifyData(cid, updatedData);
    console.log("Updated CID:", updatedCid);
    // Fetch the modified data
    const modifiedData = await fetchData(updatedCid);
    console.log("Modified Data: ", modifiedData);
    //  Decrypt the modified data
    // const decryptedModifiedData = decryptData(modifiedData, privateKey);
    // console.log("Decrypted Modified Data: ", decryptedModifiedData);

    const removalResult = await removeData(updatedCid);
    console.log("Data removal result: ", removalResult);
    // Exit the process after all operations are done
    process.exit(0); // Explicitly exit the Node.js process
  } catch (error) {
    console.error(
      "Error during encryption/decryption or data operations: ",
      error.message
    );
    process.exit(1); // Exit with error code if something fails
  }
};

// Run the test
testEncryption();
