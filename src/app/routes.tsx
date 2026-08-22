import { lazy } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { SolutionsPage } from "./pages/SolutionsPage";
import { ServicesPage } from "./pages/ServicesPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { PricingPage } from "./pages/PricingPage";
import { CompanyPage } from "./pages/CompanyPage";
import { ContactPage } from "./pages/ContactPage";
import { ChangelogPage } from "./pages/ChangelogPage";
import { StatusPage } from "./pages/StatusPage";
import { SamplePackagePage } from "./pages/resources/SamplePackagePage";
import { SourcePdfPage } from "./pages/resources/SourcePdfPage";
import { DocumentationPage } from "./pages/DocumentationPage";
import { ProtectedPremiumRoute } from "./components/ProtectedPremiumRoute";
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
const RegisterPage = lazy(() =>
  import("./pages/auth/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/auth/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const WorkspaceLoginPage = lazy(() =>
  import("./pages/auth/WorkspaceLoginPage").then((module) => ({
    default: module.WorkspaceLoginPage,
  })),
);
const VerifyEmailPage = lazy(() =>
  import("./pages/auth/VerifyEmailPage").then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import("./pages/auth/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/auth/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
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
          The AssessmentCore page you requested does not exist.
        </p>
        <a className="mt-6 inline-block text-primary underline" href="/">
          Return to AssessmentCore
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
      { path: "/resources", Component: ResourcesPage },
      { path: "/pricing", Component: PricingPage },
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
      { path: "/auth/login", Component: LoginPage },
      { path: "/auth/register", Component: RegisterPage },
      { path: "/auth/verify-email", Component: VerifyEmailPage },
      { path: "/auth/forgot-password", Component: ForgotPasswordPage },
      { path: "/auth/reset-password", Component: ResetPasswordPage },
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
          {
            path: "qti-renderer",
            element: (
              <ProtectedPremiumRoute>
                <QTIRenderer />
              </ProtectedPremiumRoute>
            ),
          },
          {
            path: "lms-export",
            element: (
              <ProtectedPremiumRoute>
                <LMSExportPage />
              </ProtectedPremiumRoute>
            ),
          },
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
