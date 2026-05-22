import { createBrowserRouter, Navigate } from "react-router";
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
import { WorkspaceLayout } from "./pages/workspace/WorkspaceLayout";
import { QTIRenderer } from "./pages/workspace/QTIRenderer";
import { BatchCreator } from "./pages/workspace/BatchCreator";
import { LMSExportPage } from "./pages/workspace/LMSExportPage";
import { DashboardPage } from "./pages/workspace/DashboardPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { VerifyEmailPage } from "./pages/auth/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/auth/ResetPasswordPage";
import { DocumentationPage } from "./pages/DocumentationPage";
import OCRProcessor from "./pages/workspace/OCRProcessor";
import { ProtectedPremiumRoute } from "./components/ProtectedPremiumRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/solutions",
    Component: SolutionsPage,
  },
  {
    path: "/services",
    Component: ServicesPage,
  },
  {
    path: "/resources",
    Component: ResourcesPage,
  },
  {
    path: "/pricing",
    Component: PricingPage,
  },
  {
    path: "/company",
    Component: CompanyPage,
  },
  {
    path: "/contact",
    Component: ContactPage,
  },
  {
    path: "/changelog",
    Component: ChangelogPage,
  },
  {
    path: "/status",
    Component: StatusPage,
  },
  {
    path: "/ocr",
    Component: OCRProcessor,
  },
  {
    path: "/documentation",
    Component: DocumentationPage,
  },
  {
    path: "/docs/:topic",
    Component: DocumentationPage,
  },
  {
    path: "/docs",
    Component: DocumentationPage,
  },
  {
    path: "/resources/sample-package",
    Component: SamplePackagePage,
  },
  {
    path: "/resources/source-pdf",
    Component: SourcePdfPage,
  },
  {
    path: "/auth",
    children: [
      {
        path: "register",
        Component: RegisterPage,
      },
      {
        path: "login",
        Component: LoginPage,
      },
      {
        path: "verify-email",
        Component: VerifyEmailPage,
      },
      {
        path: "forgot-password",
        Component: ForgotPasswordPage,
      },
      {
        path: "reset-password",
        Component: ResetPasswordPage,
      },
    ],
  },
  {
    path: "/workspace",
    Component: WorkspaceLayout,
    children: [
      {
        index: true,
        Component: DashboardPage,
      },
      {
        path: "dashboard",
        Component: DashboardPage,
      },
      {
        path: "ocr",
        Component: OCRProcessor,
      },
      {
        path: "qti-renderer",
        element: <ProtectedPremiumRoute><QTIRenderer /></ProtectedPremiumRoute>,
      },
      {
        path: "batch-creator",
        element: <ProtectedPremiumRoute><BatchCreator /></ProtectedPremiumRoute>,
      },
      {
        path: "lms-export",
        element: <ProtectedPremiumRoute><LMSExportPage /></ProtectedPremiumRoute>,
      },
    ],
  },
]);
