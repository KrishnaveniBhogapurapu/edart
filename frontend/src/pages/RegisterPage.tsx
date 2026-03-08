import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../app/store/authStore';
import { AuthForm } from '../components/auth/AuthForm';

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-3">
        <AuthForm
          mode="register"
          isLoading={isLoading}
          onSubmit={async (values) => {
            await register(values.name ?? '', values.email, values.password);
            navigate('/');
          }}
        />
        <p className="text-center text-sm text-muted">
          Already registered? <Link to="/login" className="text-accent">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
