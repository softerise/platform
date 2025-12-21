export class BookRegisteredEvent {
  constructor(public readonly bookId: string, public readonly title: string) {}
}

export class BookEvaluatedEvent {
  constructor(
    public readonly bookId: string,
    public readonly verdict: string,
    public readonly score: number | null,
    public readonly isPipelineEligible: boolean,
  ) {}
}

