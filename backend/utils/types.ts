type Book = {
    id: string;
};

type ImageMimeType = "image/jpeg" | "image/jpg" | "image/png";

type Image = {
    data: string;
    mimeType: ImageMimeType;
    classroom_id: number;
};

type Classroom = {
    username: string;
    name: string;
    classroom_id: number;
    books: Book[];
    classroom_image: string;
    users: string[];
};

type Flashcard = {
    question: string;
    answer: string;
};

export type { Book, ImageMimeType, Image, Classroom, Flashcard };
