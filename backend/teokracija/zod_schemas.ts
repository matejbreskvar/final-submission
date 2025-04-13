import { z } from 'zod';

const username_schema = z.object({
    username: z.string()
        .min(3, "username must be at least 3 characters long")
        .max(20, "username must be at most 20 characters long"),
});

const classroom_id_schema = z.object({
    classID: z.number()
        .int("classroom_id must be an integer")
        .positive("classroom_id must be a positive integer"),
});

const join_classroom_schema = z.object({
    ...username_schema.shape,
    ...classroom_id_schema.shape
});

const books_schema = z.object({
    books: z.array(z.string())
        .min(1, "books must be an array with at least one element")
        .max(10, "books must be an array with at most 10 elements")
});

const classroom_image = z.object({
    classImage: z.string()
        .url("classroom_image must be a valid URL")
});
/*
const create_classroom_schema = z.object({
    ...username_schema.shape,
    ...classroom_id_schema.shape,
    ...books_schema.shape,
    ...classroom_image.shape
});
*/


const classroom_name_schema = z.object({
    className: z.string()
});

const create_classroom_schema = z.object({
    ...classroom_name_schema.shape,
    ...username_schema.shape,
    ...classroom_id_schema.shape
});

const get_classrooms_schema = z.object({
    ...username_schema.shape
});

const prompt_schema = z.object({
    prompt: z.string()
});

const ask_ai_schema = z.object({
    ...username_schema.shape,
    ...classroom_id_schema.shape,
    ...prompt_schema.shape
});

export
{
    username_schema,
    join_classroom_schema,
    create_classroom_schema,
    get_classrooms_schema,
    ask_ai_schema
};
