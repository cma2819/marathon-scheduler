import got from 'got';
import { ResultAsync } from 'neverthrow';

type LoginData = {
  username: string;
  password: string;
};

type LoginTrackerError = 'csrf_fetch_error' | 'login_failure';
export type LoginResult = {
  sessionId: string;
};

const pickCsrfToken = (html: string) => {
  const matchResult = html.match(/csrfmiddlewaretoken" value="(.+?)"/);
  if (matchResult) {
    return matchResult[1];
  }
  return null;
};

const parseCookieValue = (cookie: string): string => {
  return cookie.split(';')[0];
};

const fetchLoginPage = async (url: string): Promise<{
  cookies: string[];
  csrfToken: string;
}> => {
  const loginPageUrl = new URL('/admin/login/?next=/admin/', url);

  const viewLoginResponse = await got.get(loginPageUrl);
  const cookies = viewLoginResponse.headers['set-cookie'] ?? [];
  const csrfToken = pickCsrfToken(viewLoginResponse.body);

  if (!csrfToken) {
    throw new Error('CSRF token not found');
  }

  return { cookies, csrfToken };
};

const doLogin = async (
  url: string, loginData: LoginData, cookies: string[], csrf: string,
): Promise<LoginResult> => {
  const doLoginUrl = new URL('/admin/login/', url);
  try {
    const response = await got.post(doLoginUrl, {
      headers: {
        Referer: doLoginUrl.toString(),
        Cookie: cookies,
      },
      form: {
        csrfmiddlewaretoken: csrf,
        username: loginData.username,
        password: loginData.password,
        next: '/admin/',
      },
      followRedirect: false,
    });

    const loginCookies = response.headers['set-cookie'] ?? [];
    const sessionIdCookie = loginCookies.find(
      item => item.includes('sessionid'))?.replace('sessionid=', '');

    if (!sessionIdCookie) {
      throw new Error('SessionId not found');
    }

    return { sessionId: parseCookieValue(sessionIdCookie) };
  }
  catch (err) {
    console.error(err);
    throw err;
  }
};

export const loginTracker = (
  url: string, loginData: LoginData,
): ResultAsync<LoginResult, LoginTrackerError> => {
  return ResultAsync.fromPromise(fetchLoginPage(url), () => {
    return 'csrf_fetch_error' as const;
  })
    .andThen(({ cookies, csrfToken }) => ResultAsync.fromPromise(
      doLogin(url, loginData, cookies, csrfToken),
      () => {
        return 'login_failure' as const;
      },
    ));
};
