import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";

const WorkspaceLayout = lazy(() =>
  import("./pages/workspace/WorkspaceLayout").then((module) => ({
    default: module.WorkspaceLayout,
  })),
);
const QTIRenderer = lazy(() =>
  import("./pages/workspace/QTIRenderer").then((module) => ({
    default: module.QTIRenderer,
  })),
);
const LMSExportPage = lazy(() =>
  import("./pages/workspace/LMSExportPage").then((module) => ({
    default: module.LMSExportPage,
  })),
);
const DashboardPage = lazy(() =>
  import("./pages/workspace/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const OCRProcessor = lazy(() => import("./pages/workspace/OCRProcessor"));
const BatchCreatorWizard = lazy(() =>
  import("./features/batch-creator/components/BatchCreatorWizard").then(
    (module) => ({ default: module.BatchCreatorWizard }),
  ),
);
const WorkspaceLoginPage = lazy(() =>
  import("./pages/auth/WorkspaceLoginPage").then((module) => ({
    default: module.WorkspaceLoginPage,
  })),
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/workspace" replace />,
  },
  {
    path: "/auth/login",
    Component: WorkspaceLoginPage,
  },
  {
    path: "/workspace",
    Component: WorkspaceLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "dashboard", Component: DashboardPage },
      { path: "ocr", Component: OCRProcessor },
      { path: "batch-creator", Component: BatchCreatorWizard },
      { path: "qti-renderer", Component: QTIRenderer },
      { path: "lms-export", Component: LMSExportPage },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/workspace" replace />,
  },
]);
