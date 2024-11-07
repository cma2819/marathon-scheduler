import { marathonApi } from "@/lib/api";
import { RunnerImportForm } from "./form";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function RunnerImportPage({ params }: Props) {
  const slug = (await params).slug;
  const api = marathonApi(process.env["API_URL"]);
  const event = await api.getEvent(slug);

  if (!event.success) {
    notFound();
  }

  return <RunnerImportForm slug={event.data.slug} />;
}
