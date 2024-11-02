"use client";

import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import { SpeedrunEvent } from "@marathon-scheduler/models";
import React from "react";
import { usePathname } from "next/navigation";

type MenuItemProps = {
  href: string;
  currentPath?: string;
  icon: React.ReactNode;
  text: string;
};

function MenuItem({ href, currentPath, icon, text }: MenuItemProps) {
  return (
    <ListItemButton href={href} selected={href === currentPath}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText primary={text} />
    </ListItemButton>
  );
}

type Props = {
  event: SpeedrunEvent;
};

export function EventDetailMenu({ event }: Props) {
  const pathname = usePathname();

  return (
    <List>
      <MenuItem
        href={`/events/-/${event.slug}`}
        icon={<HomeIcon />}
        text="イベント情報"
        currentPath={pathname}
      />
      <MenuItem
        href={`/events/-/${event.slug}/runners`}
        icon={<DirectionsRunIcon />}
        text="走者登録"
        currentPath={pathname}
      />
      <MenuItem
        href={`/events/-/${event.slug}/runs`}
        icon={<SportsEsportsIcon />}
        text="ゲーム登録"
        currentPath={pathname}
      />
    </List>
  );
}
