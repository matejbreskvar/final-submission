import express from "express";
import type { Classroom } from "../../utils/types.ts";
import { getClassrooms } from "../../utils/getClassrooms.ts";

const router = express.Router();

/**
 * Convert a local file path to a URL path for static file serving
 * @param filePath The file path to convert
 * @returns URL path for accessing the file
 */
function convertToUrlPath(filePath: string): string {
  if (!filePath) return "";

  // For image paths
  const imageMatch = filePath.match(/classrooms[\/\\](\d+)[\/\\](image)(?:[\/\\]([^\/\\]+))?/i);
  if (imageMatch && imageMatch[1] && imageMatch[2]) {
    const classroomId = imageMatch[1];
    const folder = imageMatch[2];
    const filename = imageMatch[3] || "";
    return `/files/classrooms/${classroomId}/${folder}${filename ? "/" + filename : ""}`;
  }

  // For book paths
  const bookMatch = filePath.match(/classrooms[\/\\](\d+)[\/\\](books)[\/\\]([^\/\\]+)/i);
  if (bookMatch && bookMatch[1] && bookMatch[2] && bookMatch[3]) {
    const classroomId = bookMatch[1];
    const folder = bookMatch[2];
    const filename = bookMatch[3];
    return `/files/classrooms/${classroomId}/${folder}/${filename}`;
  }

  return filePath; // Return original if no match
}

// Define the route handler
router.get("/", async (req, res) => {
  try {
    // Get username from query parameters if provided
    const username = req.query.username as string | undefined;

    // Fetch classrooms using the getClassrooms function
    const classrooms = await getClassrooms(username);

    if (!classrooms) {
      res.status(400).json({ error: "Unable to get classrooms" });
      return;
    }

    // Don't modify paths here - they should already be full URLs

    // Return the classrooms with fixed paths
    res.status(200).json({
      classrooms: classrooms,
    });
  } catch (error) {
    console.error("Error in get_classrooms route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Export the router as the default export
export default router;
