# 複数Chatworkアカウントで投稿する機能 実装手順

## 概要

`CHATWORK_ACCOUNTS` 環境変数で複数アカウントを定義し、投稿系ツール呼び出し時に `account_id` を指定することで任意のアカウントから投稿できる。

---

## 環境変数設定

```
# 従来互換（デフォルトアカウント）
CHATWORK_API_TOKEN=xxx

# 追加アカウント（名前付き、カンマ区切り）
CHATWORK_ACCOUNTS=account1:token_aaa,account2:token_bbb,bot:token_ccc
```

- `CHATWORK_ACCOUNTS` 未設定 → 従来どおり単一トークン動作
- `account_id` 省略時 → デフォルト（`CHATWORK_API_TOKEN`）を使用

---

## 実装手順

### 1. `src/chatworkClient.ts` 変更

`chatworkClient()` 関数を `accountId?` を受け取るよう変更し、アカウントマップを構築する関数を追加する。

```typescript
function buildClientMap(): Map<string, ChatworkClient> {
  const map = new Map<string, ChatworkClient>();

  const defaultToken = process.env['CHATWORK_API_TOKEN'];
  if (defaultToken) map.set('default', new ChatworkClient(defaultToken));

  const accounts = process.env['CHATWORK_ACCOUNTS'] ?? '';
  for (const entry of accounts.split(',').filter(Boolean)) {
    const [name, token] = entry.split(':');
    if (name && token) map.set(name, new ChatworkClient(token));
  }
  return map;
}

export function chatworkClient(accountId?: string): ChatworkClient {
  const map = buildClientMap();
  const key = accountId ?? 'default';
  const client = map.get(key);
  if (!client) throw new Error(`Account '${key}' not found`);
  return client;
}

export function listAccounts(): string[] {
  return [...buildClientMap().keys()];
}
```

---

### 2. `src/schema.ts` 変更

投稿系スキーマに `account_id` フィールドを追加する。

対象スキーマ:
- `postRoomMessageParamsSchema`
- `updateRoomMessageParamsSchema`
- `createRoomTaskParamsSchema`
- `updateRoomTasksStatusParamsSchema`
- `readRoomMessagesParamsSchema`
- `unreadRoomMessageParamsSchema`
- `deleteRoomMessageParamsSchema`

各スキーマに以下を追加:

```typescript
account_id: z.string().optional().describe(
  '使用するアカウントID。省略時はデフォルトアカウント（CHATWORK_API_TOKEN）を使用。'
),
```

---

### 3. `src/toolCallbacks.ts` 変更

投稿系コールバックで `account_id` を取り出し、`chatworkClient()` に渡す。

対象関数:
- `postRoomMessage`
- `updateRoomMessage`
- `createRoomTask`
- `updateRoomTaskStatus`
- `readRoomMessage`
- `unreadRoomMessage`
- `deleteRoomMessage`

変更パターン（例: `postRoomMessage`）:

```typescript
export const postRoomMessage = async (params) => {
  const { account_id, ...rest } = params;
  return chatworkClient(account_id).request({
    path: `/rooms/${rest.room_id}/messages`,
    method: 'POST',
    query: {},
    body: { body: rest.body, self_unread: rest.self_unread },
  }).then(chatworkClientResponseToCallToolResult);
};
```

---

### 4. `src/server.ts` 変更

`list_accounts` ツールを追加する。

```typescript
server.tool('list_accounts', '利用可能なChatworkアカウントID一覧を返します。', () => {
  return {
    content: [{ type: 'text', text: listAccounts().join('\n') }],
  };
});
```

---

## 後方互換

- `CHATWORK_ACCOUNTS` 未設定 → 既存動作そのまま
- `account_id` 省略 → `default`（`CHATWORK_API_TOKEN`）使用

---

## 動作確認

```bash
# ビルド
npm run build

# 型チェック
npm run type-check

# テスト
npm run test
```

MCP クライアントから `list_accounts` を呼び出してアカウント一覧を確認後、投稿系ツールで `account_id` を指定して投稿する。
