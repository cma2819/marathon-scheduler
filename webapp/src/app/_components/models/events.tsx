import { marathonApi } from "@/lib/api";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import Grid from "@mui/material/Grid2";
import { SimplePanel } from "../ui/panels";
import { notFound } from "next/navigation";

export async function EventList() {
  const events = await marathonApi(process.env["API_URL"]).listEvents();

  if (!events.success) {
    notFound();
  }

  return (
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
        <SimplePanel
          title="Events"
          actions={
            <Box component={Stack} direction="row-reverse">
              <Button variant="text" startIcon={<AddIcon />} href="/events/new">
                イベントを作成
              </Button>
            </Box>
          }
        >
          <List disablePadding>
            {events.data.data.map((event) => (
              <ListItem key={event.slug} disablePadding>
                <ListItemButton href={`/events/-/${event.slug}`}>
                  <ListItemText primary={event.name} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </SimplePanel>
      </Grid>
    </Grid>
  );
}
