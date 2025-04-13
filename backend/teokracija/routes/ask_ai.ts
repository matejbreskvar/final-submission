import express from "express";
import { ask_ai_schema } from "../zod_schemas.ts";
import { askAI } from "../../utils/askAI.ts";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Path configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const router = express.Router();

router.post("/", async (req, res) =>
{
    const validation_result = ask_ai_schema.safeParse(req.body);

    if (!validation_result.success)
    {
        res.status(400).json({ error: validation_result.error.message });
        return;
    }

    const { username: sanitized_username, classID: sanitized_classroom_id, prompt: sanitized_prompt } = validation_result.data;

    try
    {
        const books_dir = path.join(__dirname, "..", "classrooms", sanitized_classroom_id.toString(), "books");
        // Check if directory exists
        if (!fs.existsSync(books_dir))
        {
            console.error(`Books directory not found: ${books_dir}`);
            res.status(404).json({ error: "books directory not found" });
            return;
        }

        // Find all PDF files in the directory
        const books = fs
            .readdirSync(books_dir)
            .filter((file) => file.toLowerCase().endsWith(".pdf"))
            .map((file) => path.join(books_dir, file));

        if (books.length === 0)
        {
            console.error("No PDF files found in books directory");
            res.status(404).json({ error: "no PDF files found" });
            return;
        }

        console.log(`Found ${books.length} PDF files in ${books_dir}`);

        // Pass the array of PDF paths to askAI
        const response = await askAI(sanitized_classroom_id, books[0], sanitized_prompt, sanitized_username);

        if (!response)
        {
            res.status(400).json({ error: "unable to get response from ai" });
            return;
        }
        res.status(200).json({
            response: response,
        });

        return;
    } catch (error: unknown)
    {
        console.error("unexpected error:", error);
        res.status(500).json({ error: "internal server error" });
        return;
    }
});

export default router;
