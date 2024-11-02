import { cookies } from "next/headers";
import Box from "@mui/material/Box";
import { AppBar, Button, Toolbar, Typography } from "@mui/material";
import { JwtPayload } from "@marathon-scheduler/models";
import { jwtDecode } from "jwt-decode";
import Link from "next/link";

type LogoutProps = {
  apiUrl: string;
  appUrl: string;
};

function LogoutButton({ apiUrl, appUrl }: LogoutProps) {
  const redirectUrl = new URL("/", appUrl);
  const params = new URLSearchParams({
    redirect_url: redirectUrl.toString(),
  });
  const logoutUrl = new URL("/logout", apiUrl);
  logoutUrl.search = params.toString();

  return (
    <Button variant="contained" href={logoutUrl.toString()}>
      ログアウト
    </Button>
  );
}

export async function AppHeader() {
  const cookie = await cookies();
  const token = cookie.get("marathon_scheduler_token")?.value;
  const appUrl = process.env["APP_URL"] || "http://localhost:3000";
  const apiUrl = process.env["API_URL"] || "http://localhost:3001";

  const parseToken = (token: string): Partial<JwtPayload> | null => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const username = token && parseToken(token)?.username;

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Link href="/">RTA Marathon Scheduler</Link>
          </Typography>
          {username && (
            <>
              <Typography
                variant="body2"
                component="div"
                sx={{
                  mx: 2,
                }}
              >
                ログイン中: {username}
              </Typography>
              <LogoutButton apiUrl={apiUrl} appUrl={appUrl} />
            </>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
