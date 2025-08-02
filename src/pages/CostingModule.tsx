// src/pages/CostingModule.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function CostingModule() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-green-700">
        Welcome to the Costing Dashboard, Erich!
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate("/costing/add")}
          className="bg-blue-600 text-white py-4 px-6 rounded-xl shadow hover:bg-blue-700 transition-all"
        >
          ➕ Add Transactions
        </button>

        <button
          onClick={() => navigate("/costing/list")}
          className="bg-yellow-600 text-white py-4 px-6 rounded-xl shadow hover:bg-yellow-700 transition-all"
        >
          📋 View Transactions
        </button>

        <button
          onClick={() => navigate("/costing/reports")}
          className="bg-green-600 text-white py-4 px-6 rounded-xl shadow hover:bg-green-700 transition-all"
        >
          📊 Costing Reports
        </button>
      </div>
    </div>
  );
}
