import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { PostStatus } from "@/lib/database.types";

export type CampaignInfo = {
  id: string;
  slug: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type EntrantRow = {
  entryCreatedAt: string;
  postId: string | null;
  postCreatedAt: string | null;
  nickname: string;
  email: string;
  watchModel: string;
  status: PostStatus | "削除済み";
  productUrl: string | null;
  productHandle: string | null;
};

type RawEntry = {
  created_at: string;
  user_id: string;
  post_id: string | null;
  posts: {
    nickname: string;
    watch_model: string;
    status: PostStatus;
    product_url: string | null;
    product_handle: string | null;
    created_at: string;
  } | null;
};

/** auth.users から必要な user_id のメールを引く（ページング対応） */
async function getEmailMap(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[]
): Promise<Map<string, string>> {
  const need = new Set(ids);
  const map = new Map<string, string>();
  let page = 1;
  while (need.size > 0 && page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error || !data || data.users.length === 0) break;
    for (const u of data.users) {
      if (need.has(u.id)) {
        map.set(u.id, u.email ?? "");
        need.delete(u.id);
      }
    }
    if (data.users.length < 1000) break;
    page++;
  }
  return map;
}

export async function getCampaignBySlug(slug: string): Promise<CampaignInfo | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("campaigns")
    .select("id, slug, title, starts_at, ends_at, is_active")
    .eq("slug", slug)
    .maybeSingle<CampaignInfo>();
  return data ?? null;
}

export async function listCampaigns(): Promise<
  (CampaignInfo & { entry_count: number })[]
> {
  const admin = createAdminClient();
  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, slug, title, starts_at, ends_at, is_active")
    .order("starts_at", { ascending: false })
    .returns<CampaignInfo[]>();

  const list = campaigns ?? [];
  const result: (CampaignInfo & { entry_count: number })[] = [];
  for (const c of list) {
    const { count } = await admin
      .from("campaign_entries")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id);
    result.push({ ...c, entry_count: count ?? 0 });
  }
  return result;
}

/** キャンペーンの応募者一覧（管理画面・CSV共通） */
export async function getCampaignEntrants(slug: string): Promise<{
  campaign: CampaignInfo | null;
  rows: EntrantRow[];
}> {
  const admin = createAdminClient();
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) return { campaign: null, rows: [] };

  const { data: entries } = await admin
    .from("campaign_entries")
    .select(
      "created_at, user_id, post_id, posts(nickname, watch_model, status, product_url, product_handle, created_at)"
    )
    .eq("campaign_id", campaign.id)
    .order("created_at", { ascending: false })
    .returns<RawEntry[]>();

  const list = entries ?? [];
  const emailMap = await getEmailMap(
    admin,
    list.map((e) => e.user_id)
  );

  const rows: EntrantRow[] = list.map((e) => ({
    entryCreatedAt: e.created_at,
    postId: e.post_id,
    postCreatedAt: e.posts?.created_at ?? null,
    nickname: e.posts?.nickname ?? "(不明)",
    email: emailMap.get(e.user_id) ?? "",
    watchModel: e.posts?.watch_model ?? "",
    status: e.posts ? e.posts.status : "削除済み",
    productUrl: e.posts?.product_url ?? null,
    productHandle: e.posts?.product_handle ?? null,
  }));

  return { campaign, rows };
}
