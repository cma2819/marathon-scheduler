"use client";

import { useClientApi } from "@/app/_components/models/api";
import { useNotification } from "@/app/_components/models/notification";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateRunnerRequest } from "@marathon-scheduler/models";
import { Button, TextField } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";

type FormInput = {
  json: CreateRunnerRequest[];
};

const schema = z.array(
  z.object({
    name: z.string(),
    discord: z.string(),
    twitter: z.string().optional(),
    twitch: z.string().optional(),
    youtube: z.string().optional(),
    availabilities: z.object({
      unit: z.number().min(1),
      slots: z.array(
        z.object({
          datetime: z.string().datetime({ offset: true }),
        })
      ),
    }),
  })
);

export function RunnerImportForm({ slug }: { slug: string }) {
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
    setProgress(0);
    setTotal(json.length);
    setInProgress(true);
    const errors = [];
    for await (const runner of json) {
      try {
        await api.createRunner(slug, runner);
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
            : "走者情報をインポート"}
        </Button>
      </Grid>
    </Grid>
  );
}
