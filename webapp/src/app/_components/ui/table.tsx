"use client";

import {
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import React, { useState } from "react";
import { useClientApi } from "@/app/_components/models/api";
import { useRouter } from "next/navigation";
import { MarathonApi } from "@/lib/api";

export type EditActionHandler<R> = (resource: R) => void;

function EditButton<R>({
  resource,
  onEdit,
}: {
  resource: R;
  onEdit: EditActionHandler<R>;
}) {
  const handleEdit = () => {
    onEdit(resource);
  };
  return (
    <IconButton size="small" onClick={handleEdit}>
      <EditIcon />
    </IconButton>
  );
}

export type DeleteActionHandler<R> = (
  api: MarathonApi,
  resource: R
) => Promise<void>;

function DeleteButton<K extends string, R extends { [k in K]: string }>({
  confirmText,
  resource,
  onDelete,
}: {
  confirmText: string;
  resource: R;
  onDelete: DeleteActionHandler<R>;
}) {
  const router = useRouter();
  const api = useClientApi();

  const handleDelete = async () => {
    const confirmed = confirm(confirmText);

    if (confirmed) {
      await onDelete(api, resource);
      router.refresh();
    }
  };

  return (
    <IconButton size="small" onClick={handleDelete}>
      <DeleteIcon />
    </IconButton>
  );
}

export function GenericTable<K extends string, R extends { [k in K]: string }>({
  resources,
  dataKey,
  columns,
  onEdit,
  onDelete,
  present,
}: {
  resources: R[];
  dataKey: K;
  columns: {
    field: keyof R;
    name: string;
  }[];
  onEdit: EditActionHandler<R>;
  onDelete: DeleteActionHandler<R>;
  present: (r: R) => string;
}) {
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  const onChangePage = (_: unknown, p: number) => {
    setPage(p);
  };

  const onChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value));
    setPage(0);
  };

  const visibles = React.useMemo(
    () =>
      [...resources].slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [resources, page, rowsPerPage]
  );

  return (
    <>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((c, cIndex) => (
                <TableCell key={`head_${cIndex}`}>{c.name}</TableCell>
              ))}
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((resource) => (
              <TableRow key={resource[dataKey]}>
                {columns.map((c, cIndex) => (
                  <TableCell key={`${resource[dataKey]}_${cIndex}`}>
                    {resource[c.field]}
                  </TableCell>
                ))}
                <TableCell>
                  <Stack direction="row">
                    <EditButton resource={resource} onEdit={onEdit} />
                    <DeleteButton
                      confirmText={`"${present(resource)}" を削除しますか.`}
                      resource={resource}
                      onDelete={onDelete}
                    />
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 50, 100]}
        component="div"
        count={resources.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={onChangePage}
        onRowsPerPageChange={onChangeRowsPerPage}
      />
    </>
  );
}
