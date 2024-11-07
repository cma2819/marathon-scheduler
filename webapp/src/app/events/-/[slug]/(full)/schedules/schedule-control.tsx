import { useClientApi } from "@/app/_components/models/api";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Availability,
  Duration,
  UtcDateTime,
} from "@marathon-scheduler/models";
import {
  Chip,
  IconButton,
  Paper,
  Stack,
  styled,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import ClearIcon from "@mui/icons-material/Clear";
import CalendarIcon from "@mui/icons-material/CalendarMonth";
import { AvailabilityResponse } from "@marathon-scheduler/models/dist/contracts";

type Runner = {
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

type RunAttachedRow = Omit<Row, "run"> & { run: Run };

function RunnerLabel({
  runner,
  runStart,
  runEnd,
}: {
  runner: Runner;
  runStart: UtcDateTime;
  runEnd: UtcDateTime;
}) {
  const availabilities = runner.availabilities.map((ava) => ({
    start: UtcDateTime.parse(ava.start),
    end: UtcDateTime.parse(ava.end),
  }));
  const startJoinable = availabilities.find((ava) =>
    Availability.include(ava, runStart)
  );
  const isJoinable =
    startJoinable &&
    Availability.include(startJoinable, runStart) &&
    Availability.include(startJoinable, runEnd);

  const availabilityText = availabilities
    .map(
      (ava) =>
        `${UtcDateTime.toDate(
          ava.start
        ).toLocaleString()} ~ ${UtcDateTime.toDate(ava.end).toLocaleString()}`
    )
    .join(",\n");

  return (
    <Tooltip title={availabilityText}>
      <Chip
        size="small"
        sx={{ mr: 1 }}
        label={runner.name}
        color={isJoinable ? "primary" : "error"}
      />
    </Tooltip>
  );
}

const SortableRow = React.memo(function SortableRow({
  row,
  startAt,
  onDelete,
  onCalendar,
}: {
  row: RunAttachedRow;
  startAt: UtcDateTime;
  onDelete: (rowId: string) => void;
  onCalendar: (runId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDeleteRow = async () => {
    await onDelete(row.id);
  };

  const endAt = UtcDateTime.fromDate(
    new Date(
      UtcDateTime.toDate(startAt).getTime() + row.run.estimateInSec * 1000
    )
  );

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        sx={{
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <DragHandleIcon fontSize="small" />
      </TableCell>
      <TableCell>{UtcDateTime.toDate(startAt).toLocaleString()}</TableCell>
      <TableCell>{row.run.game}</TableCell>
      <TableCell>{row.run.category}</TableCell>
      <TableCell>
        {Duration.fromSeconds(row.run.estimateInSec).formatted}
      </TableCell>
      <TableCell>{Duration.fromSeconds(row.setupInSec).formatted}</TableCell>
      <TableCell>
        <Stack direction="row" justifyContent="flex-start" spacing={1}>
          {row.run.runners.map((r) => (
            <RunnerLabel
              key={r.name}
              runner={r}
              runStart={startAt}
              runEnd={endAt}
            />
          ))}
        </Stack>
      </TableCell>
      <TableCell
        sx={{
          width: "100px",
        }}
      >
        <IconButton size="small" onClick={handleDeleteRow}>
          <ClearIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            onCalendar(row.run.id);
          }}
        >
          <CalendarIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
});

const ColoredTableCell = styled(TableCell)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
}));

function DateRow({ localeString }: { localeString: string }) {
  return (
    <TableRow>
      <ColoredTableCell colSpan={8}>{localeString}</ColoredTableCell>
    </TableRow>
  );
}

function SortableRowRecursive({
  scheduleBegin,
  rows,
  current,
  index,
  startInSeconds,
  onRowDelete,
  onCalendar,
}: {
  scheduleBegin: Date;
  rows: RunAttachedRow[];
  current: RunAttachedRow;
  index: number;
  startInSeconds: number;
  onRowDelete: (rowId: string) => void;
  onCalendar: (runId: string) => void;
}) {
  const nextStart =
    startInSeconds + current.run.estimateInSec + current.setupInSec;
  const startDateTime = new Date(
    scheduleBegin.getTime() + startInSeconds * 1000
  );
  const nextStartDateTime = new Date(
    scheduleBegin.getTime() + nextStart * 1000
  );
  const passDate = startDateTime.getDate() !== nextStartDateTime.getDate();
  const next = rows[index + 1];

  return (
    <>
      <SortableRow
        startAt={UtcDateTime.fromDate(startDateTime)}
        row={current}
        onDelete={onRowDelete}
        onCalendar={onCalendar}
      />
      {next && passDate && (
        <DateRow localeString={nextStartDateTime.toLocaleDateString()} />
      )}
      {next && (
        <SortableRowRecursive
          current={next}
          index={index + 1}
          rows={rows}
          scheduleBegin={scheduleBegin}
          startInSeconds={nextStart}
          onRowDelete={onRowDelete}
          onCalendar={onCalendar}
        />
      )}
    </>
  );
}

type Schedule = {
  slug: string;
  beginAt: string;
};

type RowLike = { id: string };

export type DragRowHandler = (
  activeRow: string,
  overRow: string,
  updater: (
    active: string,
    over: string
  ) => <T extends RowLike>(rows: T[]) => T[]
) => void;

export type RowDeleteHandler = (row: string) => void;
export type OnCalendarHandler = (run: string) => void;

export default function ScheduleControl({
  event: eventSlug,
  slug,
  rows,
  runs,
  onDragged,
  onRowDelete,
  onCalendar,
}: {
  event: string;
  slug: string;
  rows: Row[];
  runs: Run[];
  onDragged: DragRowHandler;
  onRowDelete: RowDeleteHandler;
  onCalendar: OnCalendarHandler;
}) {
  const api = useClientApi();
  const [schedule, setSchedule] = useState<Schedule>();

  useEffect(() => {
    const updateSchedule = async () => {
      const result = await api.getSchedule(eventSlug, slug);
      if (result.success) {
        setSchedule(result.data);
      }
    };
    updateSchedule();
  }, [slug]);

  const viewRows = rows.map((row) => {
    const run = runs.find((r) => r.id === row.run);
    if (!run) {
      throw "Run can't attach";
    }
    return {
      ...row,
      run,
    };
  });

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    onDragged(
      active.id as string,
      over.id as string,
      (active, over) => (rows) => {
        const oldIndex = rows.findIndex((row) => row.id === active);
        const newIndex = rows.findIndex((row) => row.id === over);

        return arrayMove(rows, oldIndex, newIndex);
      }
    );
  };

  const [first] = viewRows;

  return (
    <DndContext
      autoScroll={false}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          overflow: "hidden",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>開始予定</TableCell>
              <TableCell>ゲーム</TableCell>
              <TableCell>カテゴリ</TableCell>
              <TableCell>予定タイム</TableCell>
              <TableCell>セットアップ</TableCell>
              <TableCell>走者</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schedule && (
              <DateRow
                localeString={UtcDateTime.toDate(
                  UtcDateTime.parse(schedule.beginAt)
                ).toLocaleDateString()}
              />
            )}
            {schedule && (
              <SortableContext
                items={viewRows}
                strategy={verticalListSortingStrategy}
              >
                {first && (
                  <SortableRowRecursive
                    current={first}
                    index={0}
                    rows={viewRows}
                    scheduleBegin={UtcDateTime.toDate(
                      UtcDateTime.parse(schedule.beginAt)
                    )}
                    startInSeconds={0}
                    onRowDelete={onRowDelete}
                    onCalendar={onCalendar}
                  />
                )}
              </SortableContext>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </DndContext>
  );
}
