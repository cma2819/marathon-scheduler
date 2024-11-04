"use client";

import theme from "@/app/theme";
import { Alert, Snackbar } from "@mui/material";
import { createContext, useContext, useEffect, useState } from "react";

type CloseHandler = () => void;

function NotificationAlert({
  message,
  level,
  onClose,
}: {
  message: string | undefined;
  level: MessageLevel;
  onClose: CloseHandler;
}) {
  const [stateMessage, setStateMessage] = useState<string>();
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    setStateMessage(message);
    setOpen(Boolean(message));
  }, [message]);

  useEffect(() => {
    if (!open) {
      setTimeout(onClose, theme.transitions.duration.leavingScreen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      autoHideDuration={level !== "error" ? 5000 : null}
    >
      <Alert variant="filled" color={level}>
        {stateMessage}
      </Alert>
    </Snackbar>
  );
}

type MessageLevel = "success" | "error";
type SetFlashMessage = (message: string, level?: MessageLevel) => void;

const NotificationContext = createContext<{
  setFlashMessage: SetFlashMessage;
}>({
  setFlashMessage: () => {},
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [message, setMessage] = useState<string>();
  const [level, setLevel] = useState<MessageLevel>("success");

  const setFlashMessage: SetFlashMessage = (message, level = "success") => {
    setLevel(level);
    setMessage(message);
  };

  const onAlertClose = () => {
    setMessage(undefined);
  };

  // TODO: Create message component!
  return (
    <NotificationContext.Provider
      value={{
        setFlashMessage,
      }}
    >
      <NotificationAlert
        message={message}
        level={level}
        onClose={onAlertClose}
      />
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);
