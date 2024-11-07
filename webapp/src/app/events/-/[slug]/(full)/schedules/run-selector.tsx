import {
  Autocomplete,
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
} from "@mui/material";
import React, { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import CalendarIcon from "@mui/icons-material/CalendarMonth";
import { Duration } from "@marathon-scheduler/models";

type Run = {
  id: string;
  game: string;
  category: string;
  estimateInSec: number;
  runner: string;
};

function RunTable({
  runs,
  onAdd,
  onCalendar,
}: {
  runs: Run[];
  onAdd: AddRunHandler;
  onCalendar: CalendarRunHandler;
}) {
  const handleAddRun = (run: Run) => {
    onAdd(run);
  };

  return (
    <TableContainer sx={{ height: "220px" }}>
      <Table size="small">
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell>{run.game}</TableCell>
              <TableCell>{run.category}</TableCell>
              <TableCell>
                {Duration.fromSeconds(run.estimateInSec).formatted}
              </TableCell>
              <TableCell>{run.runner}</TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={() => handleAddRun(run)}
                  sx={{ mr: 1 }}
                >
                  <AddIcon fontSize="inherit" />
                </IconButton>
                <IconButton size="small" onClick={() => onCalendar(run)}>
                  <CalendarIcon fontSize="inherit" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export type AddRunHandler = (run: Run) => void;
export type CalendarRunHandler = (run: Run) => void;

export default function RunSelector({
  runs,
  onAdd,
  onCalendar,
}: {
  runs: Run[];
  onAdd: AddRunHandler;
  onCalendar: CalendarRunHandler;
}) {
  const options = runs.map((r) => r.game);

  const [search, setSearch] = useState<string>("");

  const restRuns = runs.filter((r) => r.game.includes(search));

  return (
    <Stack direction="column" spacing={1}>
      <Autocomplete
        freeSolo
        options={options}
        renderInput={(params) => (
          <TextField {...params} size="small" label="Game" />
        )}
        value={search}
        onChange={(_, v) => setSearch(v ?? "")}
      />
      <Box>
        <RunTable runs={restRuns} onAdd={onAdd} onCalendar={onCalendar} />
      </Box>
    </Stack>
  );
}
