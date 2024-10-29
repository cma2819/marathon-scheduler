import { REST } from '@discordjs/rest';
import { randomBytes } from 'crypto';
import { APIGuildMember, APIUser, Routes } from 'discord-api-types/v10';
import got from 'got';
import { err, ok, ResultAsync } from 'neverthrow';

type StateData = {
  value: string;
  redirect: string;
};

export type StateStorageProvider = {
  save: (state: StateData) => Promise<void>;
  fetch: () => Promise<StateData | null>;
};

type DiscordCredentials = {
  clientId: string;
  redirectUrl: string;
};

type DiscordSensitiveCredentials = DiscordCredentials & {
  clientSecret: string;
};

export const makeOAuthUrl = (
  credentials: DiscordCredentials,
  redirectAfterLogin: string,
  provider: StateStorageProvider,
): ResultAsync<string, 'state_storage_error'> => {
  const state = randomBytes(16).toString('base64').substring(0, 16);

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUrl,
    response_type: 'code',
    scope: ['identify', 'guilds.members.read'].join(' '),
    state,
  });
  const url = new URL('https://discord.com/oauth2/authorize');
  url.search = params.toString();

  return ResultAsync.fromPromise(
    provider.save({
      value: state,
      redirect: redirectAfterLogin,
    }),
    (e) => {
      console.error(e);
      return 'state_storage_error' as const;
    },
  ).andThen(() => {
    return ok(url.toString());
  });
};

type Tokens = {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
};

const exchangeCodeToTokens = async (
  code: string, credentials: DiscordSensitiveCredentials,
): Promise<Tokens> => {
  const response = await got.post('https://discord.com/api/v10/oauth2/token', {
    form: {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: credentials.redirectUrl,
    },
    username: credentials.clientId,
    password: credentials.clientSecret,
  }).json<{
    access_token: string;
    expires_in: number;
    refresh_token: string;
  }>();

  return {
    accessToken: response.access_token,
    expiresIn: response.expires_in,
    refreshToken: response.refresh_token,
  };
};

type LoginErrors =
  | 'state_storage_error'
  | 'invalid_request_state'
  | 'exchange_token_error'
;

type LoginTokens = {
  tokens: Tokens;
  redirect: string;
};

export const login = (
  credentials: DiscordSensitiveCredentials,
  requestState: string,
  code: string,
  provider: StateStorageProvider,
): ResultAsync<LoginTokens, LoginErrors> => {
  return ResultAsync.fromPromise(
    provider.fetch(),
    (e) => {
      console.error(e);
      return 'state_storage_error' as const;
    },
  )
    .andThen((state) => {
      if (!state || requestState !== state.value) {
        console.error(state?.value);
        return err('invalid_request_state');
      }
      return ok(state);
    })
    .andThen((state) => {
      return ResultAsync.fromPromise(exchangeCodeToTokens(code, credentials),
        (e) => {
          console.error(e);
          return 'exchange_token_error' as const;
        })
        .map((tokens) => {
          return {
            tokens,
            redirect: state?.redirect,
          };
        });
    });
};

type DiscordProfile = {
  id: string;
  displayName: string;
  roles: string[];
};

export const getProfile = (
  bearer: string,
  guild: string,
): ResultAsync<DiscordProfile, 'failed_discord_request'> => {
  const rest = new REST({ version: '10', authPrefix: 'Bearer' }).setToken(bearer);

  const getDiscordUser = async () => {
    const me = await rest.get(Routes.user('@me')) as APIUser;
    const member = await rest.get(Routes.userGuildMember(guild)) as APIGuildMember;
    return [me, member.roles] as const;
  };

  return ResultAsync.fromPromise(getDiscordUser(), (e) => {
    console.error(e);
    return 'failed_discord_request' as const;
  }).map(([me, roles]) => ({
    id: me.id,
    displayName: me.username,
    roles: roles,
  }));
};
