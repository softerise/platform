export class NotificationSendEvent {
  constructor(
    public readonly payload: {
      type: string;
      recipient: string;
      data: Record<string, unknown>;
    },
  ) {}
}

