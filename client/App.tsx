import { Outlet } from "react-router";

import { App as AppProvider } from "@superblocksteam/library";

import { Toaster } from "./components/common/sonner";
import TopNav from "./components/TopNav";
import { ViewerProvider } from "./components/ViewerContext";

export default function AppComponent() {
  return (
    <>
      {/* Do not remove the AppProvider */}
      <AppProvider className="h-full w-full">
        <ViewerProvider>
          <div className="flex h-full w-full flex-col">
            <TopNav />
            <div className="flex-1 overflow-auto">
              <Outlet />
            </div>
          </div>
        </ViewerProvider>
      </AppProvider>
      <Toaster />
    </>
  );
}
