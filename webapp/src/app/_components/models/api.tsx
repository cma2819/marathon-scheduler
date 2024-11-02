"use client";

import { marathonApi } from "@/lib/api";
import { createContext, useContext } from "react";

type ClientContext = {
  apiUrl: string;
};

const ClientApiContext = createContext<ClientContext>({
  apiUrl: "",
});

type Props = {
  apiUrl: string;
  children: React.ReactNode;
};

export const ClientApiProvider = ({ apiUrl, children }: Props) => {
  return (
    <ClientApiContext.Provider value={{ apiUrl }}>
      {children}
    </ClientApiContext.Provider>
  );
};

export const useClientApi = () => {
  const context = useContext(ClientApiContext);
  return marathonApi(context.apiUrl);
};
