import Grid from "@mui/material/Grid2";
import { LoginButton } from "./_components/models/login";

export default async function Home() {
  const appUrl = process.env["APP_URL"] || "http://localhost:3000";
  const apiUrl = process.env["API_URL"] || "http://localhost:3001";

  return (
    <div>
      <main>
        <Grid
          container
          spacing={2}
          sx={{
            p: 2,
          }}
        >
          <Grid display="flex" size={12} justifyContent="center">
            <LoginButton apiUrl={apiUrl} baseUrl={appUrl} />
          </Grid>
        </Grid>
      </main>
    </div>
  );
}
