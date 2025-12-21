export class ChapterAddedEvent {
    constructor(
        public readonly chapterId: string,
        public readonly bookId: string,
        public readonly chapterNumber: number,
    ) { }
}

export class ChapterUpdatedEvent {
    constructor(
        public readonly chapterId: string,
        public readonly bookId: string,
        public readonly chapterNumber: number,
    ) { }
}

export class ChapterDeletedEvent {
    constructor(public readonly chapterId: string, public readonly bookId: string) { }
}

