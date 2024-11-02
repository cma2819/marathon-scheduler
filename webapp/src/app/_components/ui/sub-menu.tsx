import { Button, ButtonGroup } from "@mui/material";
import React from "react";

export type SubMenuItem = {
  text: string;
  icon: React.ReactNode;
  href: string;
};

export function SubMenu({ items }: { items: SubMenuItem[] }) {
  return (
    <ButtonGroup variant="text">
      {items.map((item, index) => (
        <Button
          key={index}
          sx={{ px: 2 }}
          startIcon={item.icon}
          href={item.href}
        >
          {item.text}
        </Button>
      ))}
    </ButtonGroup>
  );
}
