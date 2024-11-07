import { describe, it, expect } from '@jest/globals';
import { Duration } from './values';

describe('parsing duration', () => {
    it.each<[string, Duration]>([
        ['10:00', {
            formatted: '00:10:00',
            seconds: 600,
        }],
        ['1:23:45', {
            formatted: '01:23:45',
            seconds: 5025,
        }],
        ['12:00:10', {
            formatted: '12:00:10',
            seconds: 43210,
        }],
    ])('succeeded with "%s"', (s, expected) => {
        const d = Duration.parse(s);
        expect(d).toEqual(expected);
    })

    it.each<[string]>([
        ['0:12'],
        ['12'],
        ['hh:12:45']
    ])('should be failed to parse "%s"', (s) => {
        const d = Duration.parse(s);
        expect(d).toBeNull();
    })
})