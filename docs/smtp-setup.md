# SMTP接続（Resend）セットアップ手順

対象: Watch Style Club (Supabase project ref: `zhinkicjsbnrxmhfkwwu`)
送信元ドメイン: `ideareal.co.jp` のサブドメイン推奨（例: `mail.ideareal.co.jp`）
最終更新: 2026-07-03

---

## 0. なぜ必要か

Supabaseデフォルトのメール送信はレート制限が厳しく（1時間あたり数通程度）、8月キャンペーンで新規会員登録が集中すると
「マジックリンクが届かない」「パスワードリセットができない」事故が起きる。Resend等の外部SMTPに接続することで解消する。

---

## 1. Resendアカウント作成

1. https://resend.com でアカウント作成（Google/GitHubログイン可）
2. ダッシュボード左メニュー **Domains** → **Add Domain**
3. ドメイン名を入力: `mail.ideareal.co.jp`（サブドメイン推奨。ideareal.co.jp本体のMXレコード等に影響を与えないため）
4. リージョンは `ap-northeast-1 (Tokyo)` を選択（日本向けなら遅延最小）

---

## 2. DNS設定（ドメイン管理画面で追加）

Resendが表示するレコードをそのまま追加する（値はResend側の表示をコピー。以下は形式の例）。

| Type | Name | Value（例） | 用途 |
|---|---|---|---|
| MX | `mail.ideareal.co.jp` | `feedback-smtp.ap-northeast-1.amazonses.com`（優先度10） | バウンス処理 |
| TXT | `mail.ideareal.co.jp` | `v=spf1 include:amazonses.com ~all` | SPF |
| TXT | `resend._domainkey.mail.ideareal.co.jp` | `p=xxxxx...`（Resend表示のDKIM公開鍵） | DKIM |
| TXT | `_dmarc.mail.ideareal.co.jp` | `v=DMARC1; p=none;` | DMARC（任意・推奨） |

追加後、Resendダッシュボードで **Verify DNS Records** をクリック。反映まで数分〜数時間（DNSプロバイダによる）。

> ideareal.co.jpのDNS管理者（Route53 / お名前.com等）に登録依頼が必要な場合は、上記表をそのまま渡せばOK。

---

## 3. API Key発行

1. Resendダッシュボード **API Keys** → **Create API Key**
2. Name: `watch-style-club-smtp`
3. Permission: **Sending access**（Full accessでなくてよい）
4. 発行された `re_xxxxxxxxxxxx` をコピー（**一度しか表示されない**）

---

## 4. Supabase側の設定（Dashboard操作・Claudeからは実行不可）

Supabase Dashboard → プロジェクト `zhinkicjsbnrxmhfkwwu` → **Authentication** → **Emails** → **SMTP Settings**

| 項目 | 値 |
|---|---|
| Enable Custom SMTP | ON |
| Sender email | `noreply@mail.ideareal.co.jp`（Resendで検証したドメイン配下なら任意のローカル部でOK） |
| Sender name | `Watch Style Club` |
| Host | `smtp.resend.com` |
| Port | `465`（SSL）または `587`（STARTTLS） |
| Username | `resend` |
| Password | 手順3で発行したAPI Key（`re_xxxxxxxxxxxx`） |
| Minimum interval between emails | デフォルトのままでOK（Resend側のレートに従う） |

保存後、Supabase Dashboardの **Send test email** で届くか確認する。

---

## 5. メールテンプレートの日本語化

同じ **Authentication** → **Emails** → **Templates** 画面で、各テンプレートを `docs/email-templates.md` の内容に差し替える。

対象テンプレート:
- Confirm signup（新規登録確認）
- Magic Link（マジックリンクログイン）
- Reset Password（パスワードリセット）
- Change Email Address（メールアドレス変更確認）

`{{ .ConfirmationURL }}` 等のプレースホルダーはSupabaseが自動置換するので、変数名は変更しないこと。

---

## 6. 検証手順

1. `/signup` から新規登録 → 確認メールが `mail.ideareal.co.jp` から届くか
2. `/login/magic` からマジックリンク → 届くか、リンクが `https://watch-style-club.vercel.app/auth/callback` に飛ぶか
3. パスワードリセットフローを一度実施
4. Resendダッシュボードの **Logs** で送信ログ・バウンス・開封状況を確認

---

## 7. 完了後の後片付け

- 使用済みAPI Keyは `.env.local` には**書かない**（Supabase Dashboardにのみ保存される値のため）。
- このドキュメント自体はドメイン名など機微情報を含まないため通常運用でコミット可。ただしAPI Keyは絶対に記載しないこと。
