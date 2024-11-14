import { ulid as ulidLib } from 'ulid';

export const ulid = () => ulidLib(Date.now());
