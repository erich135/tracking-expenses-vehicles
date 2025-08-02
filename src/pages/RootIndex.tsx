import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const RootIndex = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to costing landing page
    navigate('/costing');
  }, [navigate]);

  return null; // No UI, just redirect
};

export default RootIndex;
