"use client";

import { useClientApi } from "@/app/_components/models/api";
import { useNotification } from "@/app/_components/models/notification";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateRunRequest } from "@marathon-scheduler/models";
import { Button, TextField } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

type FormInput = {
  json: (Omit<CreateRunRequest, "runners"> & { runners: string[] })[];
};

const schema = z.array(
  z.object({
    game: z.string(),
    category: z.string(),
    console: z.string().optional(),
    runners: z.array(
      z.string() // The name of runner
    ),
    type: z.enum(["single", "race", "coop", "relay"]),
    estimate: z
      .string()
      .transform((time) =>
        time
          .split(":")
          .map((v) => v.padStart(2, "0"))
          .join(":")
      )
      .pipe(z.string().time()),
  })
);

type Runner = {
  id: string;
  name: string;
};

export function RunImportForm({
  slug,
  runners,
}: {
  slug: string;
  runners: Runner[];
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    defaultValues: {
      json: [],
    },
    resolver: zodResolver(
      z.object({
        json: z
          .string()
          .transform((val) => {
            try {
              return JSON.parse(val);
            } catch {
              return null;
            }
          })
          .pipe(schema),
      })
    ),
    mode: "onSubmit",
  });

  const [inProgress, setInProgress] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const api = useClientApi();
  const { setFlashMessage } = useNotification();

  const onSubmit: SubmitHandler<FormInput> = async ({ json }) => {
    const payloads: CreateRunRequest[] = json.map((run) => {
      const assignees = run.runners
        .map((runner) => {
          return runners.find((r) => r.name === runner);
        })
        .filter((r): r is Runner => r !== undefined);

      return {
        ...run,
        runners: assignees.map((assign) => ({
          id: assign.id,
        })),
        estimate: run.estimate,
      };
    });

    setProgress(0);
    setTotal(payloads.length);
    setInProgress(true);
    const errors = [];
    for await (const run of payloads) {
      try {
        await api.createRun(slug, run);
      } catch (e) {
        errors.push(e);
      } finally {
        setProgress((prev) => prev + 1);
      }
    }
    setInProgress(false);
    if (errors.length > 0) {
      setFlashMessage(errors.join("\n"), "error");
    } else {
      setFlashMessage("インポートが完了しました.");
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Controller
          name="json"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="インポートJSON"
              multiline
              fullWidth
              rows={10}
              slotProps={{
                input: {
                  sx: {
                    fontSize: "0.8rem",
                  },
                },
              }}
              error={!!errors.json}
              helperText={errors.json?.message}
            />
          )}
        />
      </Grid>
      <Grid size={12}>
        <TextField
          label="errors"
          error={!!errors.json}
          value={JSON.stringify(errors, undefined, 2)}
          multiline
          slotProps={{
            input: {
              readOnly: true,
              sx: {
                fontSize: "0.8rem",
              },
            },
          }}
          fullWidth
        />
      </Grid>
      <Grid size={12}>
        <Button
          variant="contained"
          fullWidth
          onClick={handleSubmit(onSubmit)}
          disabled={inProgress}
        >
          {inProgress
            ? `実行中... (${progress} / ${total})`
            : "ゲーム情報をインポート"}
        </Button>
      </Grid>
    </Grid>
  );
}
