"use client";

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

export function OnboardingForm({
  defaultNickname,
  models,
  redirect,
}: {
  defaultNickname: string;
  models: string[];
  redirect: string;
}) {
  const [state, formAction] = useFormState(updateProfile, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="redirect" value={redirect} />

      <div>
        <label className="block text-sm font-medium">ニックネーム</label>
        <input
          type="text"
          name="nickname"
          required
          maxLength={30}
          defaultValue={defaultNickname}
          placeholder="例：watch_lover"
          className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink"
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
          className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm outline-none focus:border-ink"
        />
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
      )}

      <SubmitButton />
    </form>
  );
}
