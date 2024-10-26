export type JwtPayload = {
  sub: string;
  exp: number;
  roles: string;
};