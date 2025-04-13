import express from "express";

import { username_schema } from "../zod_schemas.ts";
import { checkUsername } from "../../utils/username.ts";

const router = express.Router();

router.post("/", async (req, res) =>
{
    const validation_result = username_schema.safeParse(req.body);

    if (!validation_result.success)
    {
        res.status(400).json({ error: validation_result.error.message });
        return;
    }

    const { username: sanitized_username } = validation_result.data;

    try
    {
        const check_username: boolean = await checkUsername(sanitized_username);

        // 200... signup
        /// 201... login
        const status_code = check_username ? 200 : 201;
        res.status(status_code).json({
            username: sanitized_username,
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
