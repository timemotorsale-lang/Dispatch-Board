import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "./repository";

export type EnterpriseOutboxPublisher = { publish(input: { payload: unknown; topic: string }): Promise<void> };

export async function processEnterpriseOutboxBatch(input: { limit?: number; now?: Date; publisher: EnterpriseOutboxPublisher; repository?: EnterpriseCommandRepository }) {
  const repository = input.repository ?? createEnterpriseCommandRepository();
  const now = input.now ?? new Date();
  const messages = await repository.claimReadyOutbox(now, Math.min(Math.max(input.limit ?? 25, 1), 100));
  let published = 0;
  let failed = 0;
  for (const message of messages) {
    try {
      await input.publisher.publish({ payload: message.payload, topic: message.topic });
      await repository.markOutboxPublished(message.id, now);
      published += 1;
    } catch (error) {
      const retryAt = new Date(now.getTime() + Math.min(60, 2 ** message.attemptCount) * 60_000);
      await repository.markOutboxFailed(message.id, error instanceof Error ? error.message : "Outbox publication failed.", retryAt);
      failed += 1;
    }
  }
  return { attempted: messages.length, failed, published };
}
