import { BrowserRouter, Routes, Route } from "react-router-dom";
import CostingModule from "./pages/CostingModule";
import CostingAdd from "./pages/CostingAdd";
import CostingList from "./pages/CostingList";
import CostingReports from "./pages/CostingReports";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CostingModule />} />
        <Route path="/costing" element={<CostingModule />} />
        <Route path="/costing/add" element={<CostingAdd />} />
        <Route path="/costing/list" element={<CostingList />} />
        <Route path="/costing/reports" element={<CostingReports />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
