"use client";

import { AvailabilityResponse, UtcDateTime } from "@marathon-scheduler/models";
import { Chip, Stack } from "@mui/material";
import {
  Chart,
  GoogleDataTableColumn,
  GoogleDataTableRow,
} from "react-google-charts";

export type RunnerAvailability = {
  runner: {
    id: string;
    name: string;
  };
  availabilities: AvailabilityResponse[];
};

export function AvailabilityChart({
  runners,
  start,
  end,
  onDelete,
}: {
  runners: RunnerAvailability[];
  start: UtcDateTime;
  end: UtcDateTime;
  onDelete: (runnerId: string) => void;
}) {
  const columns: GoogleDataTableColumn[] = [
    { type: "string", id: "Runner" },
    { type: "date", id: "Start" },
    { type: "date", id: "End" },
  ];
  const row: GoogleDataTableRow[] = runners.flatMap(
    ({ runner, availabilities }) => {
      return availabilities.map((ava) => [
        runner.name,
        UtcDateTime.toDate(UtcDateTime.parse(ava.start)),
        UtcDateTime.toDate(UtcDateTime.parse(ava.end)),
      ]);
    }
  );

  return (
    <Stack spacing={2}>
      <Stack
        spacing={1}
        direction="row"
        justifyContent="flex-start"
        component="ul"
      >
        {runners.map(({ runner }) => (
          <Chip
            key={runner.id}
            label={runner.name}
            onDelete={() => {
              onDelete(runner.id);
            }}
          />
        ))}
      </Stack>
      <Chart
        chartType="Timeline"
        data={[columns, ...row]}
        options={{
          hAxis: {
            minValue: UtcDateTime.toDate(start),
            maxValue: UtcDateTime.toDate(end),
            format: "MM/dd HH:mm",
          },
          height: 320,
        }}
      />
    </Stack>
  );
}
