'use server'

import { revalidateTag } from 'next/cache'
import { Tags } from './tags';

export const revalidateEventCache = async () => {
    revalidateTag(Tags.events());
}

export const revalidateRunnerCache = async (slug: string) => {
    revalidateTag(Tags.runners(slug));
}

export const revalidateRunCache = async (slug: string) => {
    revalidateTag(Tags.runs(slug));
}
