import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSkuWithFaces } from "@/lib/catalog";
import { consumeVerificationToken } from "@/lib/actions/verification";
import { ClaimForm } from "@/components/claim/ClaimForm";

export const dynamic = "force-dynamic";

type TokenRow = {
  purpose: string;
  target_email: string;
  payload: { sku_id?: string };
  expires_at: string;
  consumed_at: string | null;
};

function InvalidNotice({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-black/10 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold">{message}</h1>
    </div>
  );
}

export default async function ClaimPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("verification_tokens")
    .select("purpose, target_email, payload, expires_at, consumed_at")
    .eq("token", params.token)
    .maybeSingle<TokenRow>();

  if (!row) return <InvalidNotice message="このリンクは無効です。" />;
  if (row.consumed_at) return <InvalidNotice message="このリンクは既に使用されています。" />;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return <InvalidNotice message="このリンクの有効期限が切れています。" />;
  }

  const skuId = row.payload?.sku_id;
  const { label } = skuId ? await getSkuWithFaces(skuId) : { label: "" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    if (user.email.toLowerCase() === row.target_email.toLowerCase()) {
      const result = await consumeVerificationToken(params.token);
      if (result?.error) return <InvalidNotice message={result.error} />;
      return null; // consumeVerificationToken が成功時に redirect() する
    }
    return (
      <InvalidNotice message={`別のアカウント（${user.email}）でログイン中です。ログアウトしてお試しください。`} />
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
        <h1 className="text-lg font-semibold">
          🎉 {label || "ご購入"}が届いたら
          <br />
          Styleを投稿してSPを獲得しよう
        </h1>
        <p className="mt-3 text-sm text-black/60">
          <span className="font-medium text-ink">{row.target_email}</span> 宛にご本人確認のメールを送ります。
        </p>
        <ClaimForm token={params.token} targetEmail={row.target_email} />
      </div>
    </div>
  );
}
