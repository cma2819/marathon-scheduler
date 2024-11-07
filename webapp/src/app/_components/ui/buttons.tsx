"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { IconButton } from "@mui/material";

export function BackwardButton({ href }: { href: string }) {
  return (
    <IconButton href={href}>
      <ChevronLeftIcon />
    </IconButton>
  );
}
