export type JwtPayload = {
  sub: string;
  exp: number;
  username: string;
  roles: string[];
};