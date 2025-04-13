import { connectToMongoDB } from "./mongodb.js";

/**
 * Adds a user to an existing classroom
 * @param username The username of the user joining the classroom
 * @param classroomID The ID of the classroom to join
 * @returns {Promise<boolean>} Returns true if user successfully joined, false otherwise
 */
async function checkJoinClassroom(username: string, classroomID: number): Promise<boolean> {
  try {
    // Connect to the database
    const db = await connectToMongoDB();

    // Get the classrooms collection
    const classroomsCollection = db.collection("classrooms");

    // Check if classroom exists
    const existingClassroom = await classroomsCollection.findOne({ classroom_id: classroomID });
    if (!existingClassroom) {
      console.log(`Classroom with ID ${classroomID} does not exist`);
      return false;
    }

    // Check if user is already in the classroom
    if (existingClassroom.users && existingClassroom.users.includes(username)) {
      console.log(`User ${username} already joined classroom ${classroomID}`);
      return true; // User is already joined, so we consider this successful
    }

    // Add user to the classroom users array
    const result = await classroomsCollection.updateOne(
      { classroom_id: classroomID },
      { $addToSet: { users: username } } // $addToSet ensures no duplicates even if called multiple times
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error("Error joining classroom:", error);
    return false;
  }
}

export { checkJoinClassroom };
