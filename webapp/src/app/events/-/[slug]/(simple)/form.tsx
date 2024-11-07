"use client";

import { useClientApi } from "@/app/_components/models/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import Grid from "@mui/material/Grid2";
import { Button, TextField } from "@mui/material";
import { useNotification } from "@/app/_components/models/notification";
import { revalidateEventCache } from "@/lib/actions";

type FormInput = {
  name: string;
};

type Event = {
  name: string;
  slug: string;
};

export function EventEditForm({ event }: { event: Event }) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput>({
    defaultValues: {
      name: event.name,
    },
    resolver: zodResolver(
      z.object({
        name: z.string().min(3, "3文字以内で入力してください."),
      })
    ),
  });

  const api = useClientApi();
  const router = useRouter();
  const { setFlashMessage } = useNotification();

  const onSubmit: SubmitHandler<FormInput> = async (data) => {
    await api.editEvent(event.slug, {
      name: data.name,
    });
    setFlashMessage("イベントを更新しました.");
    await revalidateEventCache();
    router.refresh();
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
          <TextField label="Slug" disabled fullWidth value={event.slug} />
        </Grid>
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
          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit(onSubmit)}
          >
            更新する
          </Button>
        </Grid>
      </Grid>
    </>
  );
}
