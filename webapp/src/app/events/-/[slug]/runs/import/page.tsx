import { marathonApi } from "@/lib/api";
import { RunImportForm } from "./form";
import { RunnerResponse } from "@marathon-scheduler/models";
import { cache } from "react";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function RunImportPage({ params }: Props) {
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

  return <RunImportForm slug={event.slug} runners={runners} />;
}
