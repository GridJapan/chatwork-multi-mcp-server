import { describe, expect, test } from 'vitest';
import {
  deleteRoomMessageParamsSchema,
  getRoomMessageParamsSchema,
  readRoomMessagesParamsSchema,
  unreadRoomMessageParamsSchema,
  updateRoomMessageParamsSchema,
} from './schema.js';

describe('message_id validation', () => {
  const pathSchemas = [
    getRoomMessageParamsSchema,
    deleteRoomMessageParamsSchema,
  ] as const;

  test.each(pathSchemas)(
    'accepts a numeric message_id in the path',
    (schema) => {
      const result = schema.safeParse({
        path: { room_id: 1, message_id: '1234567890123456789' },
      });
      expect(result.success).toBe(true);
    },
  );

  test.each(['../../me', '1/../2', '12a', '', ' 1', '1?force=1'])(
    'rejects a non-numeric message_id in the path: %s',
    (messageId) => {
      for (const schema of pathSchemas) {
        const result = schema.safeParse({
          path: { room_id: 1, message_id: messageId },
        });
        expect(result.success).toBe(false);
      }
      const updateResult = updateRoomMessageParamsSchema.safeParse({
        path: { room_id: 1, message_id: messageId },
        body: { body: 'hello' },
      });
      expect(updateResult.success).toBe(false);
    },
  );

  test('validates message_id in the read/unread request body', () => {
    expect(
      readRoomMessagesParamsSchema.safeParse({
        path: { room_id: 1 },
        body: {},
      }).success,
    ).toBe(true);
    expect(
      unreadRoomMessageParamsSchema.safeParse({
        path: { room_id: 1 },
        body: { message_id: '42' },
      }).success,
    ).toBe(true);
    expect(
      unreadRoomMessageParamsSchema.safeParse({
        path: { room_id: 1 },
        body: { message_id: '../42' },
      }).success,
    ).toBe(false);
  });
});
