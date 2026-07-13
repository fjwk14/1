"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// クリップ画面の閲覧を記録する。
// - マウント時に1件挿入(=アクセス1回)
// - 滞在秒数を定期的/離脱時に更新
// - 「該当場面を動画で開く」リンクのクリックも記録
// アクセス制御・集計はサーバー側(RLS + 集計ページ)が担う。
export default function ViewTracker({ clipId }: { clipId: string }) {
  useEffect(() => {
    const supabase = createClient();
    const start = Date.now();
    let rowId: string | null = null;
    let openedVideo = false;
    let stopped = false;

    const elapsed = () =>
      Math.min(86400, Math.max(0, Math.floor((Date.now() - start) / 1000)));

    const sync = async () => {
      if (!rowId) return;
      try {
        await supabase
          .from("clip_views")
          .update({ dwell_seconds: elapsed(), opened_video: openedVideo })
          .eq("id", rowId);
      } catch {
        // 一時的な通信エラーは無視(次のsyncで再送される)
      }
    };

    const onOpenVideo = () => {
      openedVideo = true;
      void sync();
    };

    (async () => {
      try {
        const { data } = await supabase
          .from("clip_views")
          .insert({ clip_id: clipId })
          .select("id")
          .single();
        if (!stopped) rowId = (data as { id: string } | null)?.id ?? null;
      } catch {
        // 記録できなくても閲覧自体は妨げない
      }
    })();

    const link = document.querySelector("[data-open-video]");
    link?.addEventListener("click", onOpenVideo);

    const onHide = () => {
      if (document.visibilityState === "hidden") void sync();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", () => void sync());
    const timer = setInterval(() => void sync(), 15000);

    return () => {
      stopped = true;
      void sync();
      clearInterval(timer);
      link?.removeEventListener("click", onOpenVideo);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [clipId]);

  return null;
}
