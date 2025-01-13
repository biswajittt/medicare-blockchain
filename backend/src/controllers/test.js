// const { Database } = require("@tableland/sdk");
// const {
//   Wallet,
//   getDefaultProvider,
//   JsonRpcProvider,
//   ethers,
// } = require("ethers");

// const main = async () => {
//   try {
//     // Private key for the wallet
//     const privateKey =
//       "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
//     const wallet = new Wallet(privateKey);
//     // To avoid connecting to the browser wallet (locally, port 8545).
//     // For example: "https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY"
//     const provider = getDefaultProvider("http://127.0.0.1:8545");
//     const signer = wallet.connect(provider);
//     // Connect to the database
//     const db = new Database({ signer });

//     // Table prefix
//     const prefix = "my_table";

//     // Create the table
//     const { meta: create } = await db
//       .prepare(`CREATE TABLE ${prefix} (id integer primary key, val text);`)
//       .run();
//     // console.log("res->", create);

//     // Wait for transaction finality
//     let res;
//     if (typeof create.txn?.wait === "function") {
//       res = await create.txn.wait();
//     } else {
//       console.warn(
//         "Using manual waitForTransaction as txn.wait is not available."
//       );
//       res = await provider.waitForTransaction(create.txn.transactionHash);
//     }
//     console.log("Transaction result:", res);

//     // Wait for transaction finality
//     // const res = await create.txn?.wait();
//     // console.log("res->", res);
//     // Extract the table name
//     const tableName = create.txn?.name ?? ""; // e.g., my_table_31337_2

//     if (!tableName) {
//       throw new Error("Failed to retrieve the table name");
//     }

//     console.log(`Table created: ${tableName}`);

//     // Insert a row into the table
//     const { meta: insert } = await db
//       .prepare(`INSERT INTO ${tableName} (id, val) VALUES (?, ?);`)
//       .bind(0, "Bobby Tables")
//       .run();

//     // Wait for transaction finality
//     await insert.txn?.wait();

//     console.log(`Row inserted into ${tableName}`);

//     // Query the table
//     const { results } = await db.prepare(`SELECT * FROM ${tableName};`).all();
//     console.log("Query results:", results);
//   } catch (error) {
//     console.error("Error:", error.message);
//   }
// };

// // Execute the main function
// main();
