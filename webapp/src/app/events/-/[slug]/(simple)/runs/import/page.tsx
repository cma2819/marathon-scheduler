import { marathonApi } from "@/lib/api";
import { RunImportForm } from "./form";
import { RunnerResponse } from "@marathon-scheduler/models";
import { cache } from "react";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function RunImportPage({ params }: Props) {
  const slug = (await params).slug;
  const api = marathonApi(process.env["API_URL"]);
  const event = await api.getEvent(slug);

  if (!event.success) {
    notFound();
  }

  const getAllRunners = cache(async () => {
    const runners: RunnerResponse[] = [];
    let last: RunnerResponse["id"] | undefined = undefined;
    do {
      const result = await api.listRunners(
        event.data.slug,
        last ? { after: last } : undefined
      );
      if (!result.success) {
        throw result.error;
      }
      const { data } = result.data;
      runners.push(...data);
      last = data.at(-1)?.id;
    } while (last);
    return runners;
  });

  const runners = await getAllRunners();

  return <RunImportForm slug={event.data.slug} runners={runners} />;
}
