import { Button } from "@mui/material";

type Props = {
  baseUrl: string;
  apiUrl: string;
  fullWidth?: boolean;
};

export function LoginButton({ baseUrl, fullWidth }: Props) {
  const apiUrl = process.env["API_URL"];

  const redirectUrl = new URL("/", baseUrl);

  const params = new URLSearchParams({
    redirect_url: redirectUrl.toString(),
  });

  const url = new URL("/login/discord", apiUrl);
  url.search = params.toString();

  return (
    <Button variant="contained" fullWidth={fullWidth} href={url.toString()}>
      Discordでログイン
    </Button>
  );
}
