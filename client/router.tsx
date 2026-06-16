import { createBrowserRouter } from "react-router";

import { PageNotFound, RouteLoadError } from "@superblocksteam/library";

import RegisteredApp from "./App.js";

export const router = createBrowserRouter([
  {
    Component: RegisteredApp,
    errorElement: <RouteLoadError />,
    children: [
      {
        path: "/",
        index: true,
        lazy: () =>
          import("./pages/Library/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/library",
        lazy: () =>
          import("./pages/Library/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/watch/:clipId",
        lazy: () =>
          import("./pages/Watch/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/clip/:sortOrder",
        lazy: () =>
          import("./pages/DeepLink/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/xp",
        lazy: () =>
          import("./pages/XPlanation/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/admin",
        lazy: () =>
          import("./pages/Admin/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "/analytics",
        lazy: () =>
          import("./pages/Analytics/index.js").then((mod) => ({
            Component: mod.default,
          })),
      },
      {
        path: "*",
        Component: () => (
          <PageNotFound
            title="Page not found"
            errorMessage="Content not found"
            buttonPath="/"
            buttonText="Return to Clip Library"
          />
        ),
      },
    ],
  },
]);
