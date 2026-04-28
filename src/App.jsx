import { Routes, Route } from "react-router-dom";
import './App.css';
import './Responsive.css';
import './assets/fontawesome/css/all.css';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';
import Login from "./pages/auth/Login";
import PublicRoute from "./components/PublicRoute";
import Dashboard from "./pages/home/Dashboard";
import NotFound from "./components/NotFound";
import useThemeStore from "./stores/useThemeStore";
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

const App = () => {

  useThemeStore.getState().init();

  return (
    <>
      <Toast />
      <Routes>

        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />


        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        {/* Client Routes */}
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><SingleClient /></ProtectedRoute>} />

        {/* Products Routes */}
        <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
        <Route path="/products/:id" element={<ProtectedRoute><SingleProduct /></ProtectedRoute>} />
        <Route path="/products/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />


        {/* Quotations Routes */}
        <Route path="/quotations" element={<Quotations/>} />
        <Route path="/quotations/new" element={<CreateQuotation />} />
        <Route path="/quotations/:id" element={<SingleQuotation />} />
        <Route path="/quotations/:id/edit" element={<EditQuotation />} />

        {/* Proformas Routes */}
        <Route path="/proformas"          element={<Proformas />} />
        <Route path="/proformas/new"      element={<CreateProforma />} />
        <Route path="/proformas/:id"      element={<SingleProforma />} />
        <Route path="/proformas/:id/edit" element={<EditProforma />} />

        <Route path="/invoices"            element={<Invoices />} />
        <Route path="/invoices/new"        element={<CreateInvoice />} />
        <Route path="/invoices/payments"   element={<Payments />} />
        <Route path="/invoices/:id"        element={<SingleInvoice />} />
        <Route path="/invoices/:id/edit"   element={<EditInvoice />} />


        <Route path="/settings/company" element={<CompanySettings />} />
        <Route path="/settings/users"   element={<Users />} />
        <Route path="/profile"          element={<Profile />} />


        <Route path="/reports/sales"         element={<SalesSummary />} />
        <Route path="/reports/top-products"  element={<TopProducts />} />
        <Route path="/reports/vat"           element={<VatReport />} />
        <Route path="/reports/staff"         element={<StaffPerformance />} />
        <Route path="/reports/outstanding"   element={<Outstanding />} />

        <Route path="/notifications" element={<Notifications />} />


        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;