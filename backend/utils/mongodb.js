import { MongoClient } from "mongodb";

// Function to connect to MongoDB for a specific chain
async function connectToMongoDB() {
  // Base MongoDB URI from environment variable
  const baseUri = "mongodb://localhost:27017";

  // Construct the database name based on the chain
  const dbName = `education-first`;

  // Full MongoDB URI
  const uri = `${baseUri}/${dbName}`;

  // Connect to MongoDB
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(dbName);
}

export { connectToMongoDB };
