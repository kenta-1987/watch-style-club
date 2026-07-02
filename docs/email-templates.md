# 認証メール 日本語テンプレート

Supabase Dashboard → Authentication → Emails → Templates に、各テンプレートの
Subject / Body(HTML) をそのままコピー＆ペーストする。`{{ .XXX }}` はSupabaseの変数なので変更しないこと。

共通トーン: AWJ/Watch Style Clubらしい、簡潔で丁寧な文体。装飾は最小限。

---

## 1. Confirm signup（新規登録確認）

**Subject**
```
【Watch Style Club】メールアドレスの確認
```

**Body (HTML)**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h2 style="font-size: 18px; margin-bottom: 16px;">Watch Style Club へようこそ</h2>
  <p style="font-size: 14px; line-height: 1.8;">
    ご登録ありがとうございます。以下のボタンからメールアドレスの確認を完了してください。
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px;">
      メールアドレスを確認する
    </a>
  </p>
  <p style="font-size: 12px; color: #888; line-height: 1.6;">
    このメールに心当たりがない場合は、破棄してください。<br>
    ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください。<br>
    {{ .ConfirmationURL }}
  </p>
  <p style="font-size: 12px; color: #888; margin-top: 24px;">Watch Style Club</p>
</div>
```

---

## 2. Magic Link（マジックリンクログイン）

**Subject**
```
【Watch Style Club】ログイン用リンク
```

**Body (HTML)**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h2 style="font-size: 18px; margin-bottom: 16px;">ログイン用リンク</h2>
  <p style="font-size: 14px; line-height: 1.8;">
    以下のボタンからWatch Style Clubにログインできます。このリンクは一定時間で無効になります。
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px;">
      ログインする
    </a>
  </p>
  <p style="font-size: 12px; color: #888; line-height: 1.6;">
    このメールに心当たりがない場合は、破棄してください。第三者にこのメールを転送しないでください。<br>
    ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください。<br>
    {{ .ConfirmationURL }}
  </p>
  <p style="font-size: 12px; color: #888; margin-top: 24px;">Watch Style Club</p>
</div>
```

---

## 3. Reset Password（パスワードリセット）

**Subject**
```
【Watch Style Club】パスワード再設定のご案内
```

**Body (HTML)**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h2 style="font-size: 18px; margin-bottom: 16px;">パスワードの再設定</h2>
  <p style="font-size: 14px; line-height: 1.8;">
    パスワード再設定のリクエストを受け付けました。以下のボタンから新しいパスワードを設定してください。
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px;">
      パスワードを再設定する
    </a>
  </p>
  <p style="font-size: 12px; color: #888; line-height: 1.6;">
    このリクエストに心当たりがない場合は、このメールを破棄してください。パスワードは変更されません。<br>
    ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください。<br>
    {{ .ConfirmationURL }}
  </p>
  <p style="font-size: 12px; color: #888; margin-top: 24px;">Watch Style Club</p>
</div>
```

---

## 4. Change Email Address（メールアドレス変更確認）

**Subject**
```
【Watch Style Club】メールアドレス変更の確認
```

**Body (HTML)**
```html
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
  <h2 style="font-size: 18px; margin-bottom: 16px;">メールアドレス変更の確認</h2>
  <p style="font-size: 14px; line-height: 1.8;">
    アカウントのメールアドレス変更リクエストを受け付けました。以下のボタンから変更を確定してください。
  </p>
  <p style="text-align: center; margin: 32px 0;">
    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 14px;">
      変更を確定する
    </a>
  </p>
  <p style="font-size: 12px; color: #888; line-height: 1.6;">
    このリクエストに心当たりがない場合は、このメールを破棄してください。<br>
    ボタンが機能しない場合は、以下のURLをブラウザに貼り付けてください。<br>
    {{ .ConfirmationURL }}
  </p>
  <p style="font-size: 12px; color: #888; margin-top: 24px;">Watch Style Club</p>
</div>
```

---

## 補足

- Supabaseの「Invite user」テンプレートはWSCで使用していない（招待フローなし）ため未作成。将来使う場合は同トーンで追加する。
- 送信元名は `docs/smtp-setup.md` の設定で `Watch Style Club` に統一。
- HTML内の色（#1a1a1a）はブランドの黒基調に合わせたもの。変更したい場合はここを調整するだけでよい。
