export const Tags = {
    events: () => 'events',
    runners: (slug: string) => `events.${slug}.runners`,
    runs:(slug: string) => `events.${slug}.runs`,
}