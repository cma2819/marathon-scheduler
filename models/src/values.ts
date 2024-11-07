export type UtcDateTime = {
    year: number;
    month: number;
    date: number;
    hour: number;
    minute: number;
}

export const UtcDateTime = {
    parse(s: string): UtcDateTime {
        const date = new Date(s);
        return this.fromDate(date);
    },

    fromDate(d: Date): UtcDateTime {
        return {
            year: d.getUTCFullYear(),
            month: d.getUTCMonth(),
            date: d.getUTCDate(),
            hour: d.getUTCHours(),
            minute: d.getUTCMinutes(),
        }
    },

    toISOString(v: UtcDateTime): string {
        return this.toDate(v).toISOString();
    },

    toDate(udt: UtcDateTime): Date {
        return new Date(Date.UTC(udt.year, udt.month, udt.date, udt.hour, udt.minute, 0));
    },

    isBefore(v: UtcDateTime, opponent: UtcDateTime): boolean {
        return UtcDateTime.toDate(v).getTime() < UtcDateTime.toDate(opponent).getTime();
    }
}

export type Duration = {
    seconds: number;
    formatted: string;
}

export const Duration = {
    parse(s: string): Duration | null {
        const regExp = /^((?<hours>[0-9]{1,2}):)?((?<minutes>[0-9]{2}):(?<seconds>[0-9]{2}))$/;
        const result = regExp.exec(s);
        if (!result) {
            return null;
        }
        const { hours, minutes, seconds } = result.groups as { hours?: string, minutes: string, seconds: string};
        const fixedHours = (hours ? parseInt(hours) : 0)
        const asSeconds = fixedHours * 3600 + parseInt(minutes) * 60 + parseInt(seconds);

        return this.fromSeconds(asSeconds);
    },

    fromSeconds(secs: number): Duration {
        const hours = Math.floor(secs / 3600);
        const minutes = Math.floor((secs % 3600) / 60);
        const seconds = secs % 60;

        return {
            seconds: secs,
            formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        }
    }
}