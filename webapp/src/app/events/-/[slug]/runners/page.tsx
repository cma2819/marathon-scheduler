import { marathonApi } from "@/lib/api";
import { RunnerTable } from "./table";
import { cache } from "react";
import { RunnerResponse } from "@marathon-scheduler/models";
import { Stack } from "@mui/material";
import { EventRunnerControl } from "./control";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function RunnerIndexPage({ params }: Props) {
  const slug = (await params).slug;
  const api = marathonApi(process.env["API_URL"]);
  const event = await api.getEvent(slug);

  const getAllRunners = cache(async () => {
    const runners: RunnerResponse[] = [];
    let last: RunnerResponse["id"] | undefined = undefined;
    do {
      const { data } = await api.listRunners(
        event.slug,
        last ? { after: last } : undefined
      );
      runners.push(...data);
      last = data.at(-1)?.id;
    } while (last);
    return runners;
  });

  const runners = await getAllRunners();

  return (
    <Stack direction="column" spacing={2}>
      <EventRunnerControl slug={slug} />
      <RunnerTable slug={slug} runners={runners} />
    </Stack>
  );
}
