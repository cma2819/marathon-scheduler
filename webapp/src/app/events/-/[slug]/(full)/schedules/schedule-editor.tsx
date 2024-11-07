"use client";

import Grid from "@mui/material/Grid2";
import RunSelector, { AddRunHandler } from "./run-selector";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  CreateScheduleRowRequest,
  Duration,
  UtcDateTime,
} from "@marathon-scheduler/models";
import { useEffect, useMemo, useState } from "react";
import { useClientApi } from "@/app/_components/models/api";
import ScheduleControl, { DragRowHandler } from "./schedule-control";
import { useNotification } from "@/app/_components/models/notification";
import {
  AvailabilityResponse,
  ScheduleResponse,
} from "@marathon-scheduler/models/dist/contracts";
import { AvailabilityChart, RunnerAvailability } from "./availability-chart";

type Runner = {
  id: string;
  name: string;
  availabilities: AvailabilityResponse[];
};

type Run = {
  id: string;
  game: string;
  category: string;
  estimateInSec: number;
  runners: Runner[];
};

type Row = {
  id: string;
  run: string;
  setupInSec: number;
};

type Analysis = {
  count: number;
  time: string;
};

const calculateAnalysis = (runs: Run[]): Analysis => {
  const totalTime = runs.reduce((prev, current) => {
    return prev + current.estimateInSec;
  }, 0);
  return {
    count: runs.length,
    time: Duration.fromSeconds(totalTime).formatted,
  };
};

function Summary({ assigned, runs }: { assigned: Run[]; runs: Run[] }) {
  const analysis = useMemo((): Analysis => {
    return calculateAnalysis(assigned);
  }, [assigned]);
  const all = useMemo((): Analysis => {
    return calculateAnalysis(runs);
  }, [runs]);

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            <TableCell align="center">追加済</TableCell>
            <TableCell align="center">全て</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell component="th" scope="row" align="center">
              ゲーム数
            </TableCell>
            <TableCell align="right">{analysis.count}</TableCell>
            <TableCell align="right">{all.count}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell component="th" scope="row" align="center">
              時間
            </TableCell>
            <TableCell align="right">{analysis.time}</TableCell>
            <TableCell align="right">{all.time}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function ScheduleEditor({
  event,
  slug,
  runs,
}: {
  event: string;
  slug: string;
  runs: Run[];
}) {
  const api = useClientApi();
  const { setFlashMessage } = useNotification();

  const [rows, setRowsState] = useState<Row[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResponse>();

  useEffect(() => {
    const initSchedule = async () => {
      const result = await api.getSchedule(event, slug);
      if (result.success) {
        setSchedule(result.data);
      }
    };
    const initRows = async () => {
      const result = await api.listScheduleRows(event, slug);
      if (result.success) {
        setRowsState(
          result.data.map((r) => ({
            id: r.id,
            run: r.run.id,
            setupInSec: Duration.parse(r.setup)?.seconds ?? 0,
          }))
        );
      }
    };
    initSchedule();
    initRows();
  }, [event, slug]);

  const assignedRuns = runs.filter((run) =>
    rows.some((row) => row.run === run.id)
  );
  const restRuns = runs.filter((run) =>
    rows.every((row) => row.run !== run.id)
  );

  const onAddRun: AddRunHandler = async (run) => {
    const payload: CreateScheduleRowRequest = {
      run: {
        id: run.id,
      },
      setup: "00:05:00",
    };
    const lastRow = rows.at(-1);

    const row = lastRow
      ? await api.addRunNextTo(event, slug, lastRow.id, payload)
      : await api.addRunFirstToSchedule(event, slug, payload);

    if (!row.success) {
      setFlashMessage(row.error.message, "error");
      return;
    }

    setRowsState((rows) => {
      return [
        ...rows,
        {
          id: row.data.id,
          run: row.data.run.id,
          setupInSec: Duration.parse(row.data.setup)?.seconds ?? 0,
        },
      ];
    });
  };

  const onRowDragged: DragRowHandler = async (active, over, updater) => {
    const activeRow = rows.find((row) => row.id === active);
    if (!activeRow) {
      return;
    }

    if (active !== over) {
      const oldIndex = rows.findIndex((row) => row.id === active);
      const newIndex = rows.findIndex((row) => row.id === over);

      const prevIndex = oldIndex < newIndex ? newIndex : newIndex - 1;
      if (prevIndex < 0) {
        const result = await api.addRunFirstToSchedule(event, slug, {
          run: {
            id: activeRow.run,
          },
          setup: Duration.fromSeconds(activeRow.setupInSec).formatted,
        });
        if (!result.success) {
          setFlashMessage(
            "API実行でエラーが発生しました.更新してください.",
            "error"
          );
          console.error(result.error);
          return;
        }
      } else {
        const prev = rows[prevIndex];
        const result = await api.addRunNextTo(event, slug, prev.id, {
          run: {
            id: activeRow.run,
          },
          setup: Duration.fromSeconds(activeRow.setupInSec).formatted,
        });
        if (!result.success) {
          setFlashMessage(
            "API実行でエラーが発生しました.更新してください.",
            "error"
          );
          console.error(result.error);
          return;
        }
      }

      setRowsState(updater(active, over)(rows));
    }
  };

  const onRowDelete = async (rowId: string) => {
    const result = await api.deleteRow(event, slug, rowId);
    if (!result.success) {
      setFlashMessage("削除に失敗しました.", "error");
      return;
    }
    setRowsState((rows) => rows.filter((row) => row.id !== rowId));
  };

  const [onTimeline, setOnTimeline] = useState<RunnerAvailability[]>([]);

  const calcEndDate = (start: UtcDateTime): UtcDateTime => {
    const allInSeconds = runs.reduce((prev, current) => {
      return prev + current.estimateInSec;
    }, 0);

    return UtcDateTime.fromDate(
      new Date(UtcDateTime.toDate(start).getTime() + allInSeconds * 1000)
    );
  };

  const addRunToTimeline = (runId: string) => {
    setOnTimeline((timeline) => {
      const target = runs.find((r) => r.id === runId);
      if (!target) {
        return timeline;
      }

      const addRunners = target.runners.filter(
        (runner) => !timeline.some((tl) => tl.runner.id === runner.id)
      );

      return [
        ...timeline,
        ...addRunners.map(
          (runner): RunnerAvailability => ({
            runner: {
              id: runner.id,
              name: runner.name,
            },
            availabilities: runner.availabilities,
          })
        ),
      ];
    });
  };

  const onDeleteFromTimeline = (runnerId: string) => {
    setOnTimeline((timeline) => {
      return timeline.filter((tl) => tl.runner.id !== runnerId);
    });
  };

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Grid container spacing={2}>
          <Grid size="auto">
            <Summary assigned={assignedRuns} runs={runs} />
          </Grid>
          <Grid size="grow">
            <RunSelector
              runs={restRuns.map((run) => ({
                ...run,
                runner: run.runners.map((r) => r.name).join(" / "),
              }))}
              onAdd={onAddRun}
              onCalendar={(run) => {
                addRunToTimeline(run.id);
              }}
            />
          </Grid>
        </Grid>
      </Grid>
      <Grid size={12}>
        <Box
          sx={{
            maxHeight: "calc(100vh - 64px)",
            overflow: "auto",
          }}
        >
          {schedule && onTimeline.length > 0 && (
            <Box
              sx={{
                position: "sticky",
                top: "0px",
                background: "white",
                zIndex: 10,
              }}
            >
              <AvailabilityChart
                runners={onTimeline}
                start={UtcDateTime.parse(schedule.beginAt)}
                end={calcEndDate(UtcDateTime.parse(schedule.beginAt))}
                onDelete={onDeleteFromTimeline}
              />
            </Box>
          )}
          <ScheduleControl
            event={event}
            slug={slug}
            rows={rows}
            runs={runs}
            onDragged={onRowDragged}
            onRowDelete={onRowDelete}
            onCalendar={addRunToTimeline}
          />
        </Box>
      </Grid>
      <Grid size={12}></Grid>
    </Grid>
  );
}
