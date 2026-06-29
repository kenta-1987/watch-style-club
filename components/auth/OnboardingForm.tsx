"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateProfile, type ProfileFormState } from "@/lib/actions/profile";

const initialState: ProfileFormState = { error: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-full bg-ink py-3 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
    >
      {pending ? "保存中…" : "はじめる"}
    </button>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink";

export function OnboardingForm({
  needsUsername,
  suggestedUsername,
  defaultDisplayName,
  models,
  redirect,
}: {
  needsUsername: boolean;
  suggestedUsername: string;
  defaultDisplayName: string;
  models: string[];
  redirect: string;
}) {
  const [state, formAction] = useFormState(updateProfile, initialState);
  const [username, setUsername] = useState(suggestedUsername);
  const usernameOk = !needsUsername || /^[a-z0-9_]{3,20}$/.test(username);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="redirect" value={redirect} />

      {needsUsername && (
        <div>
          <label className="block text-sm font-medium">
            ユーザーID <span className="text-black/40">（変更できません）</span>
          </label>
          <div className="mt-1 flex items-center rounded-lg border border-black/15 px-3 focus-within:border-ink">
            <span className="text-sm text-black/40">@</span>
            <input
              type="text"
              name="username"
              required
              autoCapitalize="none"
              autoCorrect="off"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="kenta1987"
              className="w-full bg-transparent px-1.5 py-2 text-sm outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-black/40">
            半角英小文字・数字・_ の3〜20文字。外部に表示される唯一のIDです。
            {username && !usernameOk && (
              <span className="ml-1 text-red-500">形式が正しくありません</span>
            )}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium">表示名</label>
        <input
          type="text"
          name="display_name"
          required
          maxLength={30}
          defaultValue={defaultDisplayName}
          placeholder="例：Kenta"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Apple Watch モデル</label>
        <select
          name="watch_model"
          required
          defaultValue=""
          className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-ink"
        >
          <option value="" disabled>
            選択してください
          </option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">
          利用中のバンド <span className="text-black/40">（任意）</span>
        </label>
        <input
          type="text"
          name="current_band"
          maxLength={60}
          placeholder="例：Campagne Sélection ナイロンバンド"
          className={inputClass}
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
