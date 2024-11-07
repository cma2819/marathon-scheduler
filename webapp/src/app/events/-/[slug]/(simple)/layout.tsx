import { SimplePanel } from "@/app/_components/ui/panels";
import { marathonApi } from "@/lib/api";
import Grid from "@mui/material/Grid2";
import { EventDetailMenu } from "./menu";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export default async function EventDetailLayout({ params, children }: Props) {
  const slug = (await params).slug;
  const result = await marathonApi(process.env["API_URL"]).getEvent(slug);

  if (!result.success) {
    notFound();
  }

  const event = result.data;

  return (
    <main>
      <Grid
        container
        spacing={2}
        justifyContent="center"
        sx={{
          py: 2,
        }}
      >
        <Grid size={10}>
          <SimplePanel title={event.name}>
            <Grid container spacing={2}>
              <Grid size="auto">
                <EventDetailMenu event={event} />
              </Grid>
              <Grid
                size="grow"
                sx={{
                  p: 2,
                }}
              >
                {children}
              </Grid>
            </Grid>
          </SimplePanel>
        </Grid>
      </Grid>
    </main>
  );
}
