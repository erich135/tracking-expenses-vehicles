import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// 👇👇👇 Import your VehicleProvider
import { VehicleProvider } from './contexts/VehicleContext';

createRoot(document.getElementById("root")!).render(
  <VehicleProvider>
    <App />
  </VehicleProvider>
);
