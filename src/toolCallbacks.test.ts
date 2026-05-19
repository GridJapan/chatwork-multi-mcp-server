import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { listAccounts } from './chatworkClient';
import { postRoomMessage } from './toolCallbacks';

const originalChatworkApiToken = process.env['CHATWORK_API_TOKEN'];
const originalChatworkAccounts = process.env['CHATWORK_ACCOUNTS'];

beforeEach(() => {
  process.env['CHATWORK_API_TOKEN'] = 'default-token';
  delete process.env['CHATWORK_ACCOUNTS'];
});

afterEach(() => {
  if (originalChatworkApiToken === undefined) {
    delete process.env['CHATWORK_API_TOKEN'];
  } else {
    process.env['CHATWORK_API_TOKEN'] = originalChatworkApiToken;
  }

  if (originalChatworkAccounts === undefined) {
    delete process.env['CHATWORK_ACCOUNTS'];
  } else {
    process.env['CHATWORK_ACCOUNTS'] = originalChatworkAccounts;
  }

  vi.unstubAllGlobals();
});

describe('listAccounts', () => {
  test('returns default and named accounts from environment variables', () => {
    process.env['CHATWORK_ACCOUNTS'] =
      'account1:token_aaa, account2:token_bbb,bot:token_ccc';

    expect(listAccounts()).toEqual(['default', 'account1', 'account2', 'bot']);
  });
});

describe('postRoomMessage', () => {
  test('uses the requested account token without sending account_id in the body', async () => {
    process.env['CHATWORK_ACCOUNTS'] = 'bot:named-token';
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response('{"message_id":"1"}', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await postRoomMessage({
      account_id: 'bot',
      path: { room_id: 123 },
      body: { body: 'hello', self_unread: 0 },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] ?? [];
    const requestInit = init as RequestInit;

    expect(requestInit.headers).toMatchObject({
      'X-ChatWorkToken': 'named-token',
    });
    expect(String(requestInit.body)).toBe('body=hello&self_unread=0');
  });
});
