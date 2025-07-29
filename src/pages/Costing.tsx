// src/pages/Costing.tsx
import CostingModule from "@/components/CostingModule";

const Costing = () => {
  // TEMP: bypass role check if there is one
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Costing Access Granted</h1>
      <CostingModule />
    </div>
  );
};

export default Costing;
