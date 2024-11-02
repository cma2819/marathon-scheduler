"use client";

import React from "react";
import { SpeedrunEvent } from "@marathon-scheduler/models";
import {
  DeleteActionHandler,
  EditActionHandler,
  GenericTable,
} from "@/app/_components/ui/table";
import { useRouter } from "next/navigation";

type Runner = {
  id: string;
  name: string;
  discord: string;
  twitter?: string;
  twitch?: string;
  youtube?: string;
};

type Props = {
  slug: SpeedrunEvent["slug"];
  runners: Runner[];
};

export function RunnerTable({ slug, runners }: Props) {
  const router = useRouter();
  const onRunnerEdit: EditActionHandler<Runner> = (runner) => {
    router.push(`/events/-/slug/runners/edit/${runner.id}`);
  };

  const onRunnerDelete: DeleteActionHandler<Runner> = async (api, runner) => {
    await api.deleteRunner(slug, runner.id);
  };

  return (
    <GenericTable
      resources={runners}
      dataKey="name"
      columns={[
        { field: "name", name: "Runner" },
        { field: "discord", name: "Discord" },
        { field: "twitter", name: "Twitter" },
        { field: "twitch", name: "Twitch" },
        { field: "youtube", name: "YouTube" },
      ]}
      onEdit={onRunnerEdit}
      onDelete={onRunnerDelete}
      present={(runner) => runner.name}
    />
  );
}
