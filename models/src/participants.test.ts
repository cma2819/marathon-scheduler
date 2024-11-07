import { describe, expect, it } from '@jest/globals';
import { Availability } from './participants';
import { UtcDateTime } from './values';

describe('Make availabilities from time slots', () => {
    it('should be return first if only ONE slot', () => {
        const availabilities = Availability.fromTimeSlots([UtcDateTime.parse('2024-08-19T00:00:00Z')], 60);

        expect(availabilities).toEqual([{
            start: UtcDateTime.parse('2024-08-19T00:00:00Z'),
            end: UtcDateTime.parse('2024-08-19T01:00:00Z'),
            sort: 1,
        }])
    });
    
    it('should be merged time slots as availabilities', () => {
        const availabilities = Availability.fromTimeSlots([
            UtcDateTime.parse('2024-08-19T00:00:00Z'),
            UtcDateTime.parse('2024-08-19T01:00:00Z'),
            UtcDateTime.parse('2024-08-19T02:00:00Z'),
            UtcDateTime.parse('2024-08-19T04:00:00Z'),
            UtcDateTime.parse('2024-08-19T05:00:00Z'),
            UtcDateTime.parse('2024-08-19T10:00:00Z'),
            UtcDateTime.parse('2024-08-19T11:00:00Z'),
            UtcDateTime.parse('2024-08-19T12:00:00Z'),
        ], 60);

        expect(availabilities).toEqual([
            {
                start: UtcDateTime.parse('2024-08-19T00:00:00Z'),
                end: UtcDateTime.parse('2024-08-19T03:00:00Z'),
                sort: 1,
            },
            {
                start: UtcDateTime.parse('2024-08-19T04:00:00Z'),
                end: UtcDateTime.parse('2024-08-19T06:00:00Z'),
                sort: 2,
            },
            {
                start: UtcDateTime.parse('2024-08-19T10:00:00Z'),
                end: UtcDateTime.parse('2024-08-19T13:00:00Z'),
                sort: 3,
            },
        ]);
    })
})