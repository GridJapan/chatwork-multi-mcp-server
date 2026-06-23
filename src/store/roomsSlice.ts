import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { type Room } from '../types/room';

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * ルーム一覧キャッシュはアカウント（解決済みキー）ごとに分離する。
 * マルチアカウント運用で、あるアカウントのルームが別アカウントへ漏れないようにするため。
 */
interface RoomsState {
  byAccount: Record<string, CachedData<Room[]>>;
}

const initialState: RoomsState = {
  byAccount: {},
};

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    setRooms: (
      state,
      action: PayloadAction<{ account: string; data: Room[]; ttl: number }>,
    ) => {
      state.byAccount[action.payload.account] = {
        data: action.payload.data,
        timestamp: Date.now(),
        ttl: action.payload.ttl,
      };
    },
    clearRooms: (
      state,
      action: PayloadAction<{ account?: string } | undefined>,
    ) => {
      const account = action?.payload?.account;
      if (account) {
        delete state.byAccount[account];
      } else {
        state.byAccount = {};
      }
    },
    cleanExpiredData: (state) => {
      const now = Date.now();
      for (const [account, cached] of Object.entries(state.byAccount)) {
        if (now - cached.timestamp > cached.ttl) {
          delete state.byAccount[account];
        }
      }
    },
  },
});

export const { setRooms, clearRooms, cleanExpiredData } = roomsSlice.actions;

// Selectors
export const selectRooms = (
  state: { rooms: RoomsState },
  account: string,
): Room[] | null => {
  const cachedData = state.rooms.byAccount[account];
  if (!cachedData) return null;

  const now = Date.now();
  if (now - cachedData.timestamp > cachedData.ttl) {
    return null;
  }

  return cachedData.data;
};

export const selectPaginatedRooms = (
  state: { rooms: RoomsState },
  account: string,
  offset: number = 0,
  limit: number = 100,
): Room[] | null => {
  const rooms = selectRooms(state, account);
  if (!rooms) return null;

  return rooms.slice(offset, offset + limit);
};

export default roomsSlice.reducer;
