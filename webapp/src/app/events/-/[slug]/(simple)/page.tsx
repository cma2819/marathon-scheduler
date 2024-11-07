import { marathonApi } from "@/lib/api";
import { EventEditForm } from "./form";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EventDetailPage({ params }: Props) {
  const slug = (await params).slug;
  const api = marathonApi(process.env["API_URL"]);
  const event = await api.getEvent(slug);

  if (!event.success) {
    notFound();
  }

  return <EventEditForm event={event.data} />;
}
