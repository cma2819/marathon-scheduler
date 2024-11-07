"use client";

import React from "react";
import { SpeedrunEvent } from "@marathon-scheduler/models";
import {
  DeleteActionHandler,
  EditActionHandler,
  GenericTable,
} from "@/app/_components/ui/table";
import { useRouter } from "next/navigation";
import { useNotification } from "@/app/_components/models/notification";

type Run = {
  id: string;
  game: string;
  category: string;
  estimate: string;
  runners: string[];
};

type Props = {
  slug: SpeedrunEvent["slug"];
  runs: Run[];
};

export function RunTable({ slug, runs }: Props) {
  const router = useRouter();
  const onRunEdit: EditActionHandler<Pick<Run, "id">> = (resource) => {
    router.push(`/events/-/${slug}/runs/edit/${resource.id}`);
  };

  const { setFlashMessage } = useNotification();
  const onRunDelete: DeleteActionHandler<Pick<Run, "id">> = async (
    api,
    run
  ) => {
    const result = await api.deleteRun(slug, run.id);
    if (result.success) {
      setFlashMessage("ゲームを削除しました.");
      return;
    }
    if (result.error.code === "some_schedule_assigned") {
      setFlashMessage(
        "いずれかのスケジュールに紐づいているため、削除できませんでした.",
        "error"
      );
      return;
    }
  };

  return (
    <GenericTable
      resources={runs.map((r) => ({
        ...r,
        runners: r.runners.join(" / "),
      }))}
      dataKey="id"
      columns={[
        { field: "game", name: "ゲーム" },
        { field: "category", name: "カテゴリ" },
        { field: "estimate", name: "予定タイム" },
        { field: "runners", name: "走者" },
      ]}
      onEdit={onRunEdit}
      onDelete={onRunDelete}
      present={(run) => `${run.game} ${run.category}`}
    />
  );
}
