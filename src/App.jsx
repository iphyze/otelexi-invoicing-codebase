import { useEffect } from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import './App.css';
import './Responsive.css';
import './assets/fontawesome/css/all.css';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute from './components/RoleRoute';
import Toast from './components/Toast';
import Login from "./pages/auth/Login";
import PublicRoute from "./components/PublicRoute";
import Dashboard from "./pages/home/Dashboard";
import NotFound from "./components/NotFound";
import useThemeStore from "./stores/useThemeStore";
import useAuthStore from "./stores/useAuthStore";
import Clients from "./pages/clients/Clients";
import SingleClient from "./pages/clients/SingleClient";
import Products from "./pages/products/Products";
import SingleProduct from "./pages/products/SingleProduct";
import Categories from "./pages/products/Categories";
import Quotations from "./pages/quotations/Quotations";
import CreateQuotation from "./pages/quotations/CreateQuotation";
import SingleQuotation from "./pages/quotations/SingleQuotation";
import EditQuotation from "./pages/quotations/EditQuotation";
import Proformas from "./pages/proformas/Proformas";
import CreateProforma from "./pages/proformas/CreateProforma";
import SingleProforma from "./pages/proformas/SingleProforma";
import EditProforma from "./pages/proformas/EditProforma";
import Invoices from "./pages/invoices/Invoices";
import CreateInvoice from "./pages/invoices/CreateInvoice";
import Payments from "./pages/invoices/Payments";
import SingleInvoice from "./pages/invoices/SingleInvoice";
import EditInvoice from "./pages/invoices/EditInvoice";
import CompanySettings from "./pages/settings/CompanySettings";
import Users from "./pages/users/Users";
import Profile from "./pages/users/Profile";
import SalesSummary from "./pages/reports/SalesSummary";
import TopProducts from "./pages/reports/TopProducts";
import VatReport from "./pages/reports/VatReport";
import StaffPerformance from "./pages/reports/StaffPerformance";
import Outstanding from "./pages/reports/Outstanding";
import Notifications from "./pages/notifications/Notifications";
import PreviewInvoice from "./pages/invoices/PreviewInvoice";
import PreviewQuotation from "./pages/quotations/PreviewQuotation";
import PreviewProforma from "./pages/proformas/PreviewProforma";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import StockMovements from "./pages/inventory/StockMovements";
import AuditLogs from "./pages/admin/AuditLogs";


const App = () => {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    useThemeStore.getState().init();
    initializeAuth();
  }, [initializeAuth]);

  return (
    <>
      <Toast />
      <Routes>

        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

        {/* Dashboard is already protected, that's good */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Client Routes - Protected */}
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><SingleClient /></ProtectedRoute>} />

        {/* Products Routes - Protected */}
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/products/:id" element={<ProtectedRoute><SingleProduct /></ProtectedRoute>} />
        <Route path="/products/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />

        {/* Quotations Routes - NEEDS PROTECTION */}
        <Route path="/quotations" element={<ProtectedRoute><Quotations/></ProtectedRoute>} />
        <Route path="/quotations/new" element={<ProtectedRoute><CreateQuotation /></ProtectedRoute>} />
        <Route path="/quotations/:id" element={<ProtectedRoute><SingleQuotation /></ProtectedRoute>} />
        <Route path="/quotations/:id/edit" element={<ProtectedRoute><EditQuotation /></ProtectedRoute>} />
        <Route path="/quotations/:id/preview" element={<ProtectedRoute><PreviewQuotation /></ProtectedRoute>} />

        {/* Proformas Routes - NEEDS PROTECTION */}
        <Route path="/proformas"          element={<ProtectedRoute><Proformas /></ProtectedRoute>} />
        <Route path="/proformas/new"      element={<ProtectedRoute><CreateProforma /></ProtectedRoute>} />
        <Route path="/proformas/:id"      element={<ProtectedRoute><SingleProforma /></ProtectedRoute>} />
        <Route path="/proformas/:id/edit" element={<ProtectedRoute><EditProforma /></ProtectedRoute>} />
        <Route path="/proformas/:id/preview" element={<ProtectedRoute><PreviewProforma /></ProtectedRoute>} />

        {/* Invoices - NEEDS PROTECTION */}
        <Route path="/invoices"            element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/invoices/new"        element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><RoleRoute allowedRoles={['super_admin', 'admin', 'accounting']}><Payments /></RoleRoute></ProtectedRoute>} />
        <Route path="/invoices/payments" element={<Navigate to="/payments" replace />} />
        <Route path="/invoices/:id"        element={<ProtectedRoute><SingleInvoice /></ProtectedRoute>} />
        <Route path="/invoices/:id/edit"   element={<ProtectedRoute><EditInvoice /></ProtectedRoute>} />
        <Route path="/invoices/:id/preview" element={<ProtectedRoute><PreviewInvoice /></ProtectedRoute>} />

        {/* Inventory control */}
        <Route path="/inventory/stock-movements" element={<ProtectedRoute><RoleRoute allowedRoles={['super_admin', 'admin', 'accounting']}><StockMovements /></RoleRoute></ProtectedRoute>} />

        {/* Administration controls */}
        <Route path="/admin/audit-logs" element={<ProtectedRoute><RoleRoute allowedRoles={['super_admin']}><AuditLogs /></RoleRoute></ProtectedRoute>} />
        <Route path="/settings/company" element={<ProtectedRoute><RoleRoute allowedRoles={['super_admin']}><CompanySettings /></RoleRoute></ProtectedRoute>} />
        <Route path="/settings/users"   element={<ProtectedRoute><RoleRoute allowedRoles={['super_admin']}><Users /></RoleRoute></ProtectedRoute>} />
        <Route path="/profile"          element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Reports - NEEDS PROTECTION */}
        <Route path="/reports/sales"         element={<ProtectedRoute><SalesSummary /></ProtectedRoute>} />
        <Route path="/reports/top-products"  element={<ProtectedRoute><TopProducts /></ProtectedRoute>} />
        <Route path="/reports/vat"           element={<ProtectedRoute><VatReport /></ProtectedRoute>} />
        <Route path="/reports/staff"         element={<ProtectedRoute><StaffPerformance /></ProtectedRoute>} />
        <Route path="/reports/outstanding"   element={<ProtectedRoute><Outstanding /></ProtectedRoute>} />

        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />


        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;