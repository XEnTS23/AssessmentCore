import { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { SolutionsPage } from "./pages/SolutionsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ContentDevelopmentPage } from "./pages/services/ContentDevelopmentPage";
import { ContentDigitizationPage } from "./pages/services/ContentDigitizationPage";
import { ResourcesPage } from "./pages/ResourcesPage";

import { CompanyPage } from "./pages/CompanyPage";
import { ContactPage } from "./pages/ContactPage";
import { ChangelogPage } from "./pages/ChangelogPage";
import { StatusPage } from "./pages/StatusPage";
import { SamplePackagePage } from "./pages/resources/SamplePackagePage";
import { SourcePdfPage } from "./pages/resources/SourcePdfPage";
import { DocumentationPage } from "./pages/DocumentationPage";
import { SeoManager } from "./components/SeoManager";

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

function SeoRouteLayout() {
  return (
    <>
      <SeoManager />
      <Outlet />
    </>
  );
}

function PublicNotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
      <div>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          The requested page does not exist.
        </p>
        <a className="mt-6 inline-block text-primary underline" href="/">
          Return to Husimi
        </a>
      </div>
    </main>
  );
}

const isWorkspaceSubdomain =
  typeof window !== "undefined" &&
  window.location.hostname.startsWith("workspace.");

const publicRoutes = [
  {
    element: <SeoRouteLayout />,
    children: [
      { path: "/", Component: LandingPage },
      { path: "/solutions", Component: SolutionsPage },
      { path: "/services", Component: ServicesPage },
      { path: "/services/content-development", Component: ContentDevelopmentPage },
      { path: "/services/content-digitization", Component: ContentDigitizationPage },
      { path: "/resources", Component: ResourcesPage },

      { path: "/company", Component: CompanyPage },
      { path: "/contact", Component: ContactPage },
      { path: "/changelog", Component: ChangelogPage },
      { path: "/status", Component: StatusPage },
      { path: "/ocr", Component: OCRProcessor },
      { path: "/documentation", Component: DocumentationPage },
      { path: "/docs/:topic", Component: DocumentationPage },
      { path: "/docs", Component: DocumentationPage },
      { path: "/resources/sample-package", Component: SamplePackagePage },
      { path: "/resources/source-pdf", Component: SourcePdfPage },
      { path: "*", Component: PublicNotFoundPage },
    ],
  },
];

const workspaceRoutes = [
  {
    element: <SeoRouteLayout />,
    children: [
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
    ],
  },
];

export const router = createBrowserRouter(
  isWorkspaceSubdomain ? workspaceRoutes : publicRoutes
);
