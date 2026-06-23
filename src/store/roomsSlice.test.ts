import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import roomsReducer, {
  setRooms,
  clearRooms,
  cleanExpiredData,
  selectRooms,
  selectPaginatedRooms,
} from './roomsSlice';
import { Room } from '../types/room';

describe('roomsSlice', () => {
  const mockRooms: Room[] = [
    {
      room_id: 1,
      name: 'Room 1',
      type: 'group',
      role: 'admin',
      sticky: false,
      unread_num: 0,
      mention_num: 0,
      mytask_num: 0,
      message_num: 10,
      file_num: 2,
      task_num: 1,
      icon_path: 'https://example.com/icon1.png',
      last_update_time: 1719487723,
    },
    {
      room_id: 2,
      name: 'Room 2',
      type: 'direct',
      role: 'member',
      sticky: true,
      unread_num: 5,
      mention_num: 2,
      mytask_num: 1,
      message_num: 20,
      file_num: 0,
      task_num: 3,
      icon_path: 'https://example.com/icon2.png',
      last_update_time: 1719487724,
    },
    {
      room_id: 3,
      name: 'Room 3',
      type: 'group',
      role: 'readonly',
      sticky: false,
      unread_num: 3,
      mention_num: 0,
      mytask_num: 2,
      message_num: 15,
      file_num: 5,
      task_num: 0,
      icon_path: 'https://example.com/icon3.png',
      last_update_time: 1719487725,
    },
    {
      room_id: 4,
      name: 'Room 4',
      type: 'direct',
      role: 'member',
      sticky: false,
      unread_num: 0,
      mention_num: 1,
      mytask_num: 0,
      message_num: 8,
      file_num: 1,
      task_num: 2,
      icon_path: 'https://example.com/icon4.png',
      last_update_time: 1719487726,
    },
    {
      room_id: 5,
      name: 'Room 5',
      type: 'group',
      role: 'admin',
      sticky: true,
      unread_num: 12,
      mention_num: 3,
      mytask_num: 4,
      message_num: 50,
      file_num: 8,
      task_num: 6,
      icon_path: 'https://example.com/icon5.png',
      last_update_time: 1719487727,
    },
  ];

  const otherRooms: Room[] = [
    {
      room_id: 99,
      name: 'Other Room',
      type: 'group',
      role: 'admin',
      sticky: false,
      unread_num: 0,
      mention_num: 0,
      mytask_num: 0,
      message_num: 1,
      file_num: 0,
      task_num: 0,
      icon_path: 'https://example.com/icon99.png',
      last_update_time: 1719487799,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('reducers', () => {
    it('should return the initial state', () => {
      expect(roomsReducer(undefined, { type: 'unknown' })).toEqual({
        byAccount: {},
      });
    });

    it('should handle setRooms (per account)', () => {
      const ttl = 300000; // 5 minutes
      const now = Date.now();
      vi.setSystemTime(now);

      const action = setRooms({ account: 'yokota', data: mockRooms, ttl });
      const result = roomsReducer(undefined, action);

      expect(result.byAccount).toEqual({
        yokota: {
          data: mockRooms,
          timestamp: now,
          ttl,
        },
      });
    });

    it('keeps separate caches per account (no cross-account leakage)', () => {
      const ttl = 300000;
      const now = Date.now();
      vi.setSystemTime(now);

      let state = roomsReducer(
        undefined,
        setRooms({ account: 'yokota', data: mockRooms, ttl }),
      );
      state = roomsReducer(
        state,
        setRooms({ account: 'fujino', data: otherRooms, ttl }),
      );

      expect(selectRooms({ rooms: state }, 'yokota')).toEqual(mockRooms);
      expect(selectRooms({ rooms: state }, 'fujino')).toEqual(otherRooms);
    });

    it('should handle clearRooms for a single account', () => {
      const ttl = 300000;
      let state = roomsReducer(
        undefined,
        setRooms({ account: 'yokota', data: mockRooms, ttl }),
      );
      state = roomsReducer(
        state,
        setRooms({ account: 'fujino', data: otherRooms, ttl }),
      );

      const result = roomsReducer(state, clearRooms({ account: 'yokota' }));

      expect(result.byAccount['yokota']).toBeUndefined();
      expect(result.byAccount['fujino']).toBeDefined();
    });

    it('should handle clearRooms for all accounts', () => {
      const ttl = 300000;
      let state = roomsReducer(
        undefined,
        setRooms({ account: 'yokota', data: mockRooms, ttl }),
      );
      state = roomsReducer(
        state,
        setRooms({ account: 'fujino', data: otherRooms, ttl }),
      );

      const result = roomsReducer(state, clearRooms());

      expect(result.byAccount).toEqual({});
    });

    it('should handle cleanExpiredData - removes only expired accounts', () => {
      const ttl = 300000; // 5 minutes
      const now = Date.now();
      vi.setSystemTime(now);

      const initialState = {
        byAccount: {
          yokota: {
            data: mockRooms,
            timestamp: now - ttl - 1000, // expired
            ttl,
          },
          fujino: {
            data: otherRooms,
            timestamp: now - 60000, // valid
            ttl,
          },
        },
      };

      const result = roomsReducer(initialState, cleanExpiredData());

      expect(result.byAccount['yokota']).toBeUndefined();
      expect(result.byAccount['fujino']).toBeDefined();
    });

    it('should handle cleanExpiredData - does nothing when empty', () => {
      const initialState = { byAccount: {} };

      const result = roomsReducer(initialState, cleanExpiredData());

      expect(result.byAccount).toEqual({});
    });
  });

  describe('selectors', () => {
    describe('selectRooms', () => {
      it('should return null when account has no cache', () => {
        const state = { rooms: { byAccount: {} } };

        expect(selectRooms(state, 'yokota')).toBeNull();
      });

      it('should return rooms data when not expired', () => {
        const ttl = 300000; // 5 minutes
        const recentTime = Date.now() - 60000; // 1 minute ago

        const state = {
          rooms: {
            byAccount: {
              yokota: {
                data: mockRooms,
                timestamp: recentTime,
                ttl,
              },
            },
          },
        };

        expect(selectRooms(state, 'yokota')).toEqual(mockRooms);
      });

      it('should return null when data is expired', () => {
        const ttl = 300000; // 5 minutes
        const pastTime = Date.now() - ttl - 1000; // 1 second after expiry

        const state = {
          rooms: {
            byAccount: {
              yokota: {
                data: mockRooms,
                timestamp: pastTime,
                ttl,
              },
            },
          },
        };

        expect(selectRooms(state, 'yokota')).toBeNull();
      });
    });

    describe('selectPaginatedRooms', () => {
      const validState = {
        rooms: {
          byAccount: {
            yokota: {
              data: mockRooms,
              timestamp: Date.now() - 60000, // 1 minute ago
              ttl: 300000, // 5 minutes
            },
          },
        },
      };

      it('should return null when account cache is missing', () => {
        const state = { rooms: { byAccount: {} } };

        expect(selectPaginatedRooms(state, 'yokota', 0, 10)).toBeNull();
      });

      it('should return paginated rooms with default offset and limit', () => {
        const result = selectPaginatedRooms(validState, 'yokota');

        expect(result).toEqual(mockRooms); // All rooms (default limit 100)
      });

      it('should return paginated rooms with custom offset and limit', () => {
        const result = selectPaginatedRooms(validState, 'yokota', 1, 2);

        expect(result).toEqual([mockRooms[1], mockRooms[2]]);
      });

      it('should handle offset beyond array length', () => {
        const result = selectPaginatedRooms(validState, 'yokota', 10, 2);

        expect(result).toEqual([]);
      });

      it('should handle limit beyond remaining items', () => {
        const result = selectPaginatedRooms(validState, 'yokota', 3, 10);

        expect(result).toEqual([mockRooms[3], mockRooms[4]]);
      });

      it('should handle zero limit', () => {
        const result = selectPaginatedRooms(validState, 'yokota', 0, 0);

        expect(result).toEqual([]);
      });
    });
  });
});
