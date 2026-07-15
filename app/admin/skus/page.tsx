import { redirect } from "next/navigation";

/** 旧URL互換: SKU管理は商品カタログ管理（/admin/products）に統合された */
export default function SkusRedirectPage() {
  redirect("/admin/products");
}
