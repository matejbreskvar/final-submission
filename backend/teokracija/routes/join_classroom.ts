import express from 'express';
import { join_classroom_schema } from '../zod_schemas.ts';
import { checkJoinClassroom } from '../../utils/joinClassroom.ts';

const router = express.Router();

router.post('/', async (req, res) =>
{
    const validation_result = join_classroom_schema.safeParse(req.body);

    if (!validation_result.success)
    {
        res.status(400).json({ error: validation_result.error.message });
        return;
    }

    const { username: sanitized_username, classID: sanitized_classroom_id } = validation_result.data;

    try
    {
        const check_join_classroom: boolean = await checkJoinClassroom(sanitized_username, sanitized_classroom_id);

        if (!check_join_classroom)
        {
            res.status(400).json({ error: "unable to join class" });
            return;
        }

        res.status(200).json(
            {
                username: sanitized_username,
                classroom_id: sanitized_classroom_id
            });

        return;
    }

    catch (error: unknown)
    {
        console.error("unexpected error:", error);
        res.status(500).json({ error: "internal server error" });
        return;
    }
});

export default router;
