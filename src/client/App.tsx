import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import Categories from "./pages/Categories";
import DataHealth from "./pages/DataHealth";
import Forecast from "./pages/Forecast";
import MonthToDate from "./pages/MonthToDate";
import Overview from "./pages/Overview";
import PayPeriods from "./pages/PayPeriods";
import Transactions from "./pages/Transactions";

export default function App() {
  return <AppShell><Routes><Route path="/" element={<Overview />} /><Route path="/month-to-date" element={<MonthToDate />} /><Route path="/pay-periods" element={<PayPeriods />} /><Route path="/categories" element={<Categories />} /><Route path="/forecast" element={<Forecast />} /><Route path="/transactions" element={<Transactions />} /><Route path="/data-health" element={<DataHealth />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></AppShell>;
}
