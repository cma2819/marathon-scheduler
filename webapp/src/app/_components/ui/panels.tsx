import { Box, Divider, Paper, Stack, Typography } from "@mui/material";
import React from "react";

type PanelProps = {
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

export function SimplePanel({ title, children, actions }: PanelProps) {
  return (
    <Paper component={Stack} variant="outlined">
      <Box>
        <Typography
          variant="h5"
          component="div"
          sx={{
            textAlign: "center",
            my: 2,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Divider />
      {children}
      <Divider />
      {actions}
    </Paper>
  );
}
