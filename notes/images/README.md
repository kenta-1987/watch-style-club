# note記事用 画像

記事: `notes/2026-08-two-minutes-left.md`

| ファイル | 用途 | サイズ |
| --- | --- | --- |
| `01-eyecatch.png` | note見出し画像 | 1280×670 (@2x) |
| `02-quote.png` | 本文中の引用カード | 1280×720 (@2x) |
| `03-breakdown.png` | 6工程の分解図 | 1280×720 (@2x) |

## 差し込み位置

- `02-quote.png` … 「速さは、AIの性能から出てきたんじゃない。」の直前
- `03-breakdown.png` … 「渡したのは、6つのうち4つだけ」の見出し直後

## 作り直し方

`src/` のHTMLを編集して、以下を実行する。文言だけならHTMLの本文を触れば足りる。

```bash
HS=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
cd notes/images/src
$HS --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --force-device-scale-factor=2 --window-size=1280,670 \
    --screenshot=../01-eyecatch.png file://$PWD/01-eyecatch.html
```

02 / 03 は `--window-size=1280,720` で同様に。

`--force-device-scale-factor=2` は網膜表示向けの2倍解像度出力。`--window-size` は
CSS上の論理サイズを指定する（出力PNGはその2倍の実ピクセルになる）。

通常の `chrome` バイナリではビューポート高さがウィンドウ指定とずれて下端が
切れるため、必ず `headless_shell` を使うこと。

## デザイン

- 配色・枠線・級数は `base.css` に集約。シリーズで使い回す前提
- 和文は IPAPGothic（環境の既定日本語フォント）
- アクセント `#b99a63` は「AIに渡した側」、白抜きは「自分に残した側」を表す。
  03の図はこの対比が主役なので、色を増やさないこと
