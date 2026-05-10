import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import VehicleDetail from "./pages/VehicleDetail";
import AdminStock from "./pages/AdminStock";
import AddVehicle from "./pages/AddVehicle";
import EditVehicle from "./pages/EditVehicle";
import StockReports from "./pages/StockReports";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ResetPasswordSuccess from "./pages/ResetPasswordSuccess";
import RequestPasswordReset from "./pages/RequestPasswordReset";
import { useEffect } from "react";
import { getDjangoAdminUrl } from "./api/axios";

function DjangoAdminRedirect() {
  useEffect(() => {
    window.location.replace(getDjangoAdminUrl());
  }, []);

  return <h1>Opening Django admin...</h1>;
}

function App() {
  useEffect(() => {
    const blockContextMenu = (event) => event.preventDefault();
    document.addEventListener("contextmenu", blockContextMenu);
    return () => document.removeEventListener("contextmenu", blockContextMenu);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<RequestPasswordReset />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
        <Route path="/reset-password/success" element={<ResetPasswordSuccess />} />
        <Route path="/django-admin/*" element={<DjangoAdminRedirect />} />
        <Route path="/vehicle/:number" element={<VehicleDetail />} />
        <Route path="/admin" element={<AdminStock />} />
        <Route path="/reports" element={<StockReports />} />
        <Route path="/add" element={<AddVehicle />} />
        <Route path="/edit/:number" element={<EditVehicle />} />
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
