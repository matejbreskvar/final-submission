import { connectToMongoDB } from "./mongodb.js";

/**
 * Checks if a username already exists in the database
 * @param username The username to check
 * @returns {Promise<boolean>} Returns true if username is available (new user), false if already taken
 */
async function checkUsername(username: string): Promise<boolean> {
  try {
    // Connect to the database
    const db = await connectToMongoDB();

    // Check if username exists in the 'users' collection
    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ username });

    // Return true if username is available (new user), false if it already exists
    return existingUser === null;
  } catch (error) {
    console.error("Error checking username:", error);
    // In case of error, we return false to be safe (don't allow using the username)
    return false;
  }
}

export { checkUsername };
