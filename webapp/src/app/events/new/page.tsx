import { SimplePanel } from "@/app/_components/ui/panels";
import Grid from "@mui/material/Grid2";
import { NewEventForm } from "./_components/form";

export default function EventDetailPage() {
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
        <Grid
          size={{
            xs: 12,
            md: 8,
            lg: 6,
          }}
        >
          <SimplePanel title="イベント作成">
            <NewEventForm />
          </SimplePanel>
        </Grid>
      </Grid>
    </main>
  );
}
