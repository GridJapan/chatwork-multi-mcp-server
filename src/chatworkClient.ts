interface ChatworkClientRequest {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query: Record<string, string | number | undefined>;
  body: Record<string, string | number | undefined>;
}

export interface ChatworkClientResponse {
  uri: string;
  ok: boolean;
  status: number;
  response: string;
}

export class ChatworkClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async request(req: ChatworkClientRequest): Promise<ChatworkClientResponse> {
    const url = new URL(`https://api.chatwork.com/v2${req.path}`);
    Object.entries(req.query)
      .filter(([, value]) => value !== undefined)
      .forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });

    const body = new URLSearchParams();
    Object.entries(req.body)
      .filter(([, value]) => value !== undefined)
      .forEach(([key, value]) => {
        body.append(key, String(value));
      });

    const fetchInit: RequestInit = {
      method: req.method,
      headers: {
        'X-ChatWorkToken': this.token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    if (body.size > 0) {
      fetchInit.body = body;
    }

    const response = await fetch(url.toString(), fetchInit);
    const rawResponseText = await response.text();

    // Unicodeエスケープを解除する
    let responseText: string;
    try {
      responseText = JSON.stringify(JSON.parse(rawResponseText));
    } catch {
      responseText = rawResponseText;
    }

    return {
      uri: url.toString(),
      ok: response.ok,
      status: response.status,
      response: responseText,
    };
  }
}

function buildClientMap(): Map<string, ChatworkClient> {
  const map = new Map<string, ChatworkClient>();

  const defaultToken = process.env['CHATWORK_API_TOKEN'];
  if (defaultToken) {
    map.set('default', new ChatworkClient(defaultToken));
  }

  const accounts = process.env['CHATWORK_ACCOUNTS'] ?? '';
  for (const rawEntry of accounts.split(',')) {
    const entry = rawEntry.trim();
    if (!entry) {
      continue;
    }

    const separatorIndex = entry.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const name = entry.slice(0, separatorIndex).trim();
    const token = entry.slice(separatorIndex + 1).trim();
    if (name && token) {
      map.set(name, new ChatworkClient(token));
    }
  }

  return map;
}

/**
 * account_id（あるいは省略時のデフォルト）を実際に使用するアカウントキーへ解決する。
 *
 * 解決順:
 *   1. account_id が明示された  → そのキー（存在しなければ利用可能一覧を添えてエラー）
 *   2. 'default'（CHATWORK_API_TOKEN）が存在 → 'default'
 *   3. CHATWORK_DEFAULT_ACCOUNT が指す名前が存在 → その名前
 *   4. アカウントが1件だけ        → その1件
 *   5. それ以外                   → account_id 必須エラー（利用可能一覧つき）
 */
function resolveAccountKey(
  map: Map<string, ChatworkClient>,
  accountId?: string,
): string {
  const available = [...map.keys()];

  if (accountId) {
    if (!map.has(accountId)) {
      throw new Error(
        `Account '${accountId}' not found. Available accounts: ${available.join(', ') || '(none)'}`,
      );
    }
    return accountId;
  }

  if (map.has('default')) {
    return 'default';
  }

  const envDefault = process.env['CHATWORK_DEFAULT_ACCOUNT']?.trim();
  if (envDefault) {
    if (!map.has(envDefault)) {
      throw new Error(
        `CHATWORK_DEFAULT_ACCOUNT='${envDefault}' is not a configured account. Available accounts: ${available.join(', ') || '(none)'}`,
      );
    }
    return envDefault;
  }

  if (available.length === 1) {
    return available[0]!;
  }

  if (available.length === 0) {
    throw new Error(
      'No Chatwork accounts configured. Set CHATWORK_ACCOUNTS (e.g. "yokota:TOKEN,fujino:TOKEN") or CHATWORK_API_TOKEN.',
    );
  }

  throw new Error(
    `account_id is required: multiple accounts are configured (${available.join(', ')}) and no default is set. ` +
      'Pass account_id, or set CHATWORK_DEFAULT_ACCOUNT.',
  );
}

/** 与えられた account_id を実際に使用するアカウントキーへ解決して返す（キャッシュのキー等に使用）。 */
export function resolveAccountId(accountId?: string): string {
  return resolveAccountKey(buildClientMap(), accountId);
}

export function chatworkClient(accountId?: string): ChatworkClient {
  const map = buildClientMap();
  const key = resolveAccountKey(map, accountId);
  // resolveAccountKey が解決したキーは必ず map に存在する
  return map.get(key)!;
}

export function listAccounts(): string[] {
  return [...buildClientMap().keys()];
}
