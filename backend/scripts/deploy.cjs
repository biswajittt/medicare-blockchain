const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const envDirPath = path.join(__dirname, ".."); // Correct path to the backend folder
const envPath = path.join(envDirPath, ".env");

// Function to read the .env file and parse its content
const readEnvFile = () => {
  try {
    if (!fs.existsSync(envPath)) {
      // console.log(`.env file not found at ${envPath}. Creating a new one.`);
      fs.writeFileSync(envPath, "", { flag: "w" }); // Create the file if it doesn't exist
    }
    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split("\n").filter((line) => line.trim() !== "");
    const env = {};
    lines.forEach((line) => {
      const [key, value] = line.split("=");
      env[key] = value;
    });
    return env;
  } catch (error) {
    console.error("Error reading .env file:", error.message);
    return {};
  }
};

// Function to write new variables to the .env file
async function updateEnvFile(
  patientAddress,
  labAddress,
  doctorAddress,
  hospitalAddress
) {
  const currentEnv = readEnvFile(); // Read current environment variables

  // Add new environment variables
  const newEnv = {
    ...currentEnv,
    PATIENT_CONTRACT_ADDRESS: patientAddress,
    DOCTOR_CONTRACT_ADDRESS: doctorAddress,
    LAB_CONTRACT_ADDRESS: labAddress,
    HOSPITAL_CONTRACT_ADDRESS: hospitalAddress,
  };

  // Convert the updated environment object back to a string
  const envContent = Object.keys(newEnv)
    .map((key) => `${key}=${newEnv[key]}`)
    .join("\n");

  // Write the updated content back to the .env file
  fs.writeFileSync(envPath, envContent, { flag: "w" });
}

async function main() {
  // Deploy Patient contract
  const Patient = await hre.ethers.getContractFactory("Patient");
  const patient = await Patient.deploy();
  await patient.waitForDeployment();
  const patientAddress = await patient.getAddress();
  console.log("Patient contract deployed to:", patientAddress);

  // Deploy Doctor contract
  const Doctor = await hre.ethers.getContractFactory("Doctor");
  const doctor = await Doctor.deploy();
  await doctor.waitForDeployment();
  const doctorAddress = await doctor.getAddress();
  console.log("Doctor contract deployed to:", doctorAddress);

  // Deploy Lab contract
  const Lab = await hre.ethers.getContractFactory("Lab");
  const lab = await Lab.deploy();
  await lab.waitForDeployment();
  const labAddress = await lab.getAddress();
  console.log("Lab contract deployed to:", labAddress);

  // Deploy Hospital contract
  const Hospital = await hre.ethers.getContractFactory("Hospital");
  const hospital = await Hospital.deploy(doctorAddress);
  await hospital.waitForDeployment();
  const hospitalAddress = await hospital.getAddress();
  console.log("Hospital contract deployed to:", hospitalAddress);

  // Update the .env file
  updateEnvFile(
    patientAddress,
    labAddress,
    doctorAddress,
    hospitalAddress
  ).catch((error) => {
    console.error("Error updating .env file:", error.message);
  });
  console.log("Contract addresses written to .env file.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
