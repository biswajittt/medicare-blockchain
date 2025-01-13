import { addData, getData, deleteData, updateData } from "./helia.js";

// Core CRUD functions
async function storeData(data) {
  try {
    const cid = await addData(data);
    return cid;
  } catch (error) {
    throw new Error(`Failed to store data: ${error.message}`);
  }
}

async function fetchData(cidString) {
  try {
    const data = await getData(cidString);
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

async function removeData(cidString) {
  try {
    const result = await deleteData(cidString);
    return result;
  } catch (error) {
    throw new Error(`Failed to remove data: ${error.message}`);
  }
}

async function modifyData(cidString, newData) {
  try {
    const updatedCid = await updateData(cidString, newData);
    return updatedCid;
  } catch (error) {
    throw new Error(`Failed to modify data: ${error.message}`);
  }
}

export { storeData, fetchData, removeData, modifyData };
