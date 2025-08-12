import React from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { motion } from 'framer-motion';

const HomePage = () => {
  const { user } = useAuth();

  return (
    <>
      <Helmet>
        <title>Home - FleetFlow</title>
        <meta name="description" content="Welcome to the FleetFlow dashboard." />
      </Helmet>
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-800 dark:text-white">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <img 
            src="https://horizons-cdn.hostinger.com/bda8c80c-e734-409b-a672-4fa843b3b414/be1ac99c0184750332a8355755d81cd9.png" 
            alt="Company Logo" 
            className="h-32 mx-auto mb-8" 
          />
        </motion.div>
        <motion.h1 
          className="text-4xl md:text-5xl font-bold mb-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Welcome Back!
        </motion.h1>
        {user && (
          <motion.p 
            className="text-lg md:text-xl text-gray-600 dark:text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {user.email}
          </motion.p>
        )}
      </div>
    </>
  );
};

export default HomePage;