import { Link, useNavigate } from 'react-router-dom';
import { AuthForm } from '../components/auth/AuthForm';
import { useAuthStore } from '../app/store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-3">
        <AuthForm
          mode="login"
          isLoading={isLoading}
          onSubmit={async (values) => {
            await login(values.email, values.password);
            navigate('/');
          }}
        />
        <p className="text-center text-sm text-muted">
          New here? <Link to="/register" className="text-accent">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
