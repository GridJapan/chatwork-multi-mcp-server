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

export function chatworkClient(accountId?: string): ChatworkClient {
  const key = accountId ?? 'default';
  const client = buildClientMap().get(key);
  if (!client) {
    throw new Error(`Account '${key}' not found`);
  }

  return client;
}

export function listAccounts(): string[] {
  return [...buildClientMap().keys()];
}
