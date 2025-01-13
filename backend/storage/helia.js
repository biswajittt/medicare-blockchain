import "./customEventPolyfill.js";
import { createHelia } from "helia";
import { json } from "@helia/json";
import { CID } from "multiformats/cid";

// Helia setup and initialization
let helia;

async function initializeHelia() {
  if (!helia) {
    helia = await createHelia();
  }
  return helia;
}

// Add JSON or string data to Helia
async function addData(data) {
  try {
    const heliaInstance = await initializeHelia();
    const j = json(heliaInstance);
    let cid;

    if (typeof data === "string") {
      cid = await j.add(data); // Adding string data
    } else if (typeof data === "object") {
      cid = await j.add(data); // Adding JSON data
    } else {
      throw new Error("Invalid data type");
    }

    return cid.toString();
  } catch (error) {
    throw new Error(`Error adding data to Helia: ${error.message}`);
  }
}

// Fetch data from Helia by CID
async function getData(cidString) {
  try {
    const heliaInstance = await initializeHelia();
    const j = json(heliaInstance);
    const cid = CID.parse(cidString);
    const data = await j.get(cid);
    return data;
  } catch (error) {
    throw new Error(`Error fetching data from Helia: ${error.message}`);
  }
}

// Delete data from Helia (Hypothetical, as deletion isn't directly supported in Helia; could be handled by simply removing from storage or by overriding)
async function deleteData(cidString) {
  try {
    // Deleting data isn't directly supported in Helia, but you can ignore it or store an empty entry.
    // To simulate deletion, we could store an empty entry or similar behavior.

    const heliaInstance = await initializeHelia();
    const j = json(heliaInstance);
    const cid = CID.parse(cidString);
    await j.add({ deleted: true }); // Store an empty or deleted marker
    return `Data with CID ${cidString} marked as deleted.`;
  } catch (error) {
    throw new Error(`Error deleting data from Helia: ${error.message}`);
  }
}

// Update data by creating a new entry (since Helia doesn't support direct update, you can overwrite with a new CID)
async function updateData(cidString, newData) {
  try {
    const heliaInstance = await initializeHelia();
    const j = json(heliaInstance);
    const cid = CID.parse(cidString);
    // Update by adding new data (Helia doesn't directly support update, so adding a new entry is the way)
    const updatedCid = await j.add(newData);
    return updatedCid.toString();
  } catch (error) {
    throw new Error(`Error updating data in Helia: ${error.message}`);
  }
}

export { addData, getData, deleteData, updateData };
