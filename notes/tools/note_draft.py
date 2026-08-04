#!/usr/bin/env python3
"""Markdownの記事をnoteの下書きとして作成する。

noteに公式APIは無い。ブラウザのエディタが叩いているのと同じ非公式エンドポイントを、
ログイン済みセッションのCookieを借りて呼ぶ。したがって:

  - noteの仕様変更で予告なく壊れる
  - 連続実行や高頻度アクセスはしない（noteの規約で禁止されている）
  - Cookieはアカウントそのものなので、コードにも履歴にも残さない

使い方:

    export NOTE_COOKIE='_note_session_v5=...; XSRF-TOKEN=...'
    python3 notes/tools/note_draft.py notes/2026-08-two-minutes-left.md

送信せずにHTMLだけ確認する:

    python3 notes/tools/note_draft.py --dry-run notes/2026-08-two-minutes-left.md

Cookieの取り方:
  1. ブラウザでnoteにログイン
  2. DevTools → Application → Cookies → https://note.com
  3. `_note_session_v5` と `XSRF-TOKEN` の2つの値を上の形式で並べる

画像は貼らない。下書きができたらエディタで手動で差し込むこと
（画像アップロードは別エンドポイントで、下書き作成とは別の話になる）。
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://note.com"
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


# ---------------------------------------------------------------- markdown 変換

def _inline(text: str) -> str:
    """行内の記法だけをHTMLにする。エスケープしてから戻す順序に注意。"""
    out = html.escape(text, quote=False)
    out = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", out)
    return out


def markdown_to_note_html(md: str) -> tuple[str, str]:
    """(タイトル, 本文HTML) を返す。

    noteのエディタが吐くのは <p> / <h3> / <hr> / <ul> / <ol> 程度の素朴なHTML。
    それ以上の要素を送っても保存時に落とされるので、あえて対応を絞っている。
    """
    lines = md.splitlines()

    title = ""
    if lines and lines[0].startswith("# "):
        title = lines[0][2:].strip()
        lines = lines[1:]

    parts: list[str] = []
    buf: list[str] = []          # 段落として溜めている行
    list_buf: list[str] = []     # 箇条書きとして溜めている行
    list_tag = ""                # "ul" or "ol"

    def flush_para() -> None:
        if buf:
            # 段落内の改行は <br> にする。noteは1行ずつ <p> に割ることも多いが、
            # 意図した改行位置が保たれる方を採る。
            parts.append("<p>" + "<br>".join(_inline(x) for x in buf) + "</p>")
            buf.clear()

    def flush_list() -> None:
        nonlocal list_tag
        if list_buf:
            items = "".join(f"<li>{_inline(x)}</li>" for x in list_buf)
            parts.append(f"<{list_tag}>{items}</{list_tag}>")
            list_buf.clear()
            list_tag = ""

    for raw in lines:
        line = raw.rstrip()

        if not line.strip():
            flush_para()
            flush_list()
            continue

        if line.startswith("## "):
            flush_para()
            flush_list()
            parts.append(f"<h3>{_inline(line[3:].strip())}</h3>")
            continue

        if re.fullmatch(r"-{3,}", line.strip()):
            flush_para()
            flush_list()
            parts.append("<hr>")
            continue

        m = re.match(r"^[-*]\s+(.*)$", line)
        if m:
            flush_para()
            if list_tag and list_tag != "ul":
                flush_list()
            list_tag = "ul"
            list_buf.append(m.group(1))
            continue

        m = re.match(r"^\d+\.\s+(.*)$", line)
        if m:
            flush_para()
            if list_tag and list_tag != "ol":
                flush_list()
            list_tag = "ol"
            list_buf.append(m.group(1))
            continue

        flush_list()
        buf.append(line)

    flush_para()
    flush_list()
    return title, "".join(parts)


def visible_length(body_html: str) -> int:
    """noteが body_length として持っている、タグを除いた文字数。"""
    return len(re.sub(r"<[^>]+>", "", body_html))


# ---------------------------------------------------------------------- 通信

class NoteClient:
    def __init__(self, cookie: str):
        self.cookie = cookie.strip()
        self.xsrf = self._extract_xsrf(self.cookie)

    @staticmethod
    def _extract_xsrf(cookie: str) -> str:
        for chunk in cookie.split(";"):
            name, _, value = chunk.strip().partition("=")
            if name == "XSRF-TOKEN":
                # Cookie内はURLエンコードされている。デコードせずに
                # X-XSRF-TOKEN に載せると 422 で弾かれる。
                return urllib.parse.unquote(value)
        raise SystemExit(
            "NOTE_COOKIE に XSRF-TOKEN が入っていない。\n"
            "DevTools の Cookies から _note_session_v5 と XSRF-TOKEN の両方をコピーすること。"
        )

    def _post(self, path: str, payload: dict, referer: str = BASE) -> dict:
        url = f"{BASE}{path}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, method="POST")
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        req.add_header("Cookie", self.cookie)
        req.add_header("X-XSRF-TOKEN", self.xsrf)
        req.add_header("X-Requested-With", "XMLHttpRequest")
        req.add_header("Origin", BASE)
        req.add_header("Referer", referer)
        req.add_header("User-Agent", UA)

        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            raise SystemExit(
                f"POST {path} が HTTP {e.code} で失敗した。\n"
                f"レスポンス: {body[:1000]}\n\n"
                "401/403ならCookieの期限切れ、422ならXSRF-TOKENかペイロードの形。\n"
                "ブラウザで note.com を開き直してCookieを取り直すのが最初の一手。"
            ) from e

    def create_draft(self, title: str, body_html: str) -> str:
        """空の下書きを作ってからHTMLを流し込む。noteのエディタと同じ2段構え。"""
        created = self._post("/api/v1/text_notes", {"template_key": None})
        note_id = str(
            created.get("data", {}).get("id")
            or created.get("id")
            or ""
        )
        if not note_id:
            raise SystemExit(
                f"下書きIDが取れなかった。レスポンス: {json.dumps(created)[:1000]}"
            )

        query = urllib.parse.urlencode({"id": note_id, "is_temp_saved": "true"})
        self._post(
            f"/api/v1/text_notes/draft_save?{query}",
            {
                "name": title,
                "body": body_html,
                "body_length": visible_length(body_html),
                "index": False,
                "is_lead_form": False,
                "separator": None,
                "price": 0,
                "free_body": None,
                "limited": False,
            },
            referer=f"{BASE}/notes/{note_id}/edit",
        )
        return note_id


# ---------------------------------------------------------------------- CLI

def main() -> None:
    ap = argparse.ArgumentParser(description="Markdownをnoteの下書きにする")
    ap.add_argument("markdown", help="記事のMarkdownファイル")
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="送信せず、変換後のタイトルとHTMLを表示するだけ",
    )
    args = ap.parse_args()

    md = open(args.markdown, encoding="utf-8").read()
    title, body_html = markdown_to_note_html(md)

    if not title:
        raise SystemExit("1行目が `# タイトル` で始まっていない。")

    if args.dry_run:
        print(f"タイトル: {title}")
        print(f"本文文字数: {visible_length(body_html)}")
        print("-" * 60)
        print(body_html)
        return

    cookie = os.environ.get("NOTE_COOKIE", "")
    if not cookie:
        raise SystemExit(
            "環境変数 NOTE_COOKIE が空。\n"
            "  export NOTE_COOKIE='_note_session_v5=...; XSRF-TOKEN=...'\n"
            "シェル履歴に残さないよう、先頭にスペースを置いて実行するのが安全。"
        )

    note_id = NoteClient(cookie).create_draft(title, body_html)
    print(f"下書きを作成した: {BASE}/notes/{note_id}/edit")
    print("画像はエディタで差し込むこと（notes/images/ の3点）。")


if __name__ == "__main__":
    main()
