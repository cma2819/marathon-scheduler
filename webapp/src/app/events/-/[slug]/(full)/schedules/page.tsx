import { ApiService, marathonApi } from "@/lib/api";
import { notFound } from "next/navigation";
import ScheduleEditor from "./schedule-editor";
import { Duration } from "@marathon-scheduler/models";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EventSchedulePage({ params }: Props) {
  const { slug } = await params;
  const api = marathonApi(process.env["API_URL"]);
  const result = await api.getEvent(slug);

  if (!result.success) {
    notFound();
  }

  const runs = await ApiService(api).getAllRuns(result.data.slug);

  return (
    <ScheduleEditor
      event={result.data.slug}
      slug={"main"}
      runs={runs.map((run) => ({
        id: run.id,
        game: run.game,
        category: run.category,
        estimateInSec: Duration.parse(run.estimate)?.seconds ?? 0,
        runners: run.runners,
      }))}
    />
  );
}
