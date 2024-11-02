"use client";

import { Button, TextField } from "@mui/material";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import Grid from "@mui/material/Grid2";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useClientApi } from "@/app/_components/models/api";
import { useRouter } from "next/navigation";

type FormInput = {
  name: string;
  slug: string;
};

export function NewEventForm() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    defaultValues: {
      name: "",
      slug: "",
    },
    resolver: zodResolver(
      z.object({
        name: z.string().min(3, "3文字以上で入力してください"),
        slug: z
          .string()
          .min(3, "3文字以上で入力してください")
          .max(255, "255文字以内で入力してください")
          .regex(/[a-z,A-Z,0-9,\-,\_]+/, "半角英数字と -, _ のみが使えます"),
      })
    ),
  });

  const api = useClientApi();
  const router = useRouter();

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    const result = await api.createEvent({
      name: data.name,
      slug: data.slug,
    });
    router.push(`/events/-/${result.slug}`);
  };

  return (
    <>
      <Grid
        container
        spacing={2}
        sx={{
          p: 2,
        }}
      >
        <Grid size={12}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="イベント名"
                fullWidth
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )}
          />
        </Grid>
        <Grid size={12}>
          <Controller
            name="slug"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Slug"
                fullWidth
                error={!!errors.slug}
                helperText={errors.slug?.message}
              />
            )}
          />
        </Grid>
        <Grid size={12}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit(onSubmit)}
          >
            作成する
          </Button>
        </Grid>
      </Grid>
    </>
  );
}
