import { REST } from '@discordjs/rest';
import { randomBytes } from 'crypto';
import { APIGuildMember, APIUser, Routes } from 'discord-api-types/v10';
import got from 'got';
import { err, ok, ResultAsync } from 'neverthrow';

export type StateStorageProvider = {
  save: (state: string) => Promise<void>;
  fetch: () => Promise<string | null>;
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
  provider: StateStorageProvider,
): ResultAsync<string, 'state_storage_error'> => {
  const state = randomBytes(16).toString('base64').substring(0, 16);

  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: credentials.redirectUrl,
    response_type: 'code',
    scope: 'identify',
    state,
  });
  const url = new URL('https://discord.com/oauth2/authorize');
  url.search = params.toString();

  return ResultAsync.fromPromise(
    provider.save(state),
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

const exchangeCodeToTokens = async (code: string, redirectUrl: string): Promise<Tokens> => {
  const response = await got.post('https://discord.com/api/v10/oauth2/tokens', {
    form: {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUrl,
    },
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

export const login = (
  credentials: DiscordSensitiveCredentials,
  requestState: string,
  code: string,
  provider: StateStorageProvider,
): ResultAsync<Tokens, LoginErrors> => {
  return ResultAsync.fromPromise(
    provider.fetch(),
    (e) => {
      console.error(e);
      return 'state_storage_error' as const;
    },
  )
    .andThen((state) => {
      if (requestState !== state) {
        return err('invalid_request_state');
      }
      return ok(undefined);
    })
    .andThen(() => {
      return ResultAsync.fromPromise(exchangeCodeToTokens(code, credentials.redirectUrl),
        (e) => {
          console.error(e);
          return 'exchange_token_error' as const;
        });
    });
};

type DiscordProfile = {
  id: string;
  displayName: string;
  roles: string[];
};

export const getRoles = (
  bearer: string,
  guild: string,
): ResultAsync<DiscordProfile, 'failed_discord_request'> => {
  const rest = new REST({ version: '10' }).setToken(bearer);

  const getDiscordUser = async () => {
    const me = await rest.get(Routes.user('@me')) as APIUser;
    const member = await rest.get(Routes.guildMember(guild, me.id)) as APIGuildMember;
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
