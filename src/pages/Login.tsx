import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('erich.oberholzer@gmail.com'); // for quick testing
  const [password, setPassword] = useState(''); // fill manually
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
const handleLogin = async () => {
  setError(''); // clear any previous error

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  console.log("LOGIN RESPONSE:", { data, error });

  if (error) {
    setError(error.message);
  } else if (!data?.session) {
    setError("Login failed. Please check your credentials.");
  } else {
    navigate('/');
  }
};

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Login</h1>

      <input
        type="email"
        placeholder="Email"
        className="mb-2 p-2 border rounded w-64"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="mb-2 p-2 border rounded w-64"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        onClick={handleLogin}
        disabled={loading}
        className={`px-4 py-2 rounded w-64 ${loading ? 'bg-blue-300' : 'bg-blue-600'} text-white`}
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}

      <p className="text-sm mt-2">
        Don't have an account?{' '}
        <button className="text-blue-600 underline" onClick={() => navigate('/register')}>
          Register
        </button>
      </p>
    </div>
  );
}
