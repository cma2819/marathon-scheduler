import { marathonApi } from "@/lib/api";
import { cache } from "react";
import { RunResponse } from "@marathon-scheduler/models";
import { RunTable } from "./table";
import { Stack } from "@mui/material";
import { EventRunControl } from "./control";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function RunIndexPage({ params }: Props) {
  const slug = (await params).slug;
  const api = marathonApi(process.env["API_URL"]);
  const event = await api.getEvent(slug);

  const getAllRuns = cache(async () => {
    const runs: RunResponse[] = [];
    let last: RunResponse["id"] | undefined = undefined;
    do {
      const { data } = await api.listRuns(
        event.slug,
        last ? { after: last } : undefined
      );
      runs.push(...data);
      last = data.at(-1)?.id;
    } while (last);
    return runs;
  });

  const runs = await getAllRuns();

  return (
    <Stack direction="column">
      <EventRunControl slug={slug} />
      <RunTable
        slug={slug}
        runs={runs.map((run) => ({
          ...run,
          runners: run.runners.map((r) => r.name),
        }))}
      />
    </Stack>
  );
}
