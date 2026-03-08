import { FormEvent, useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit: (values: { name?: string; email: string; password: string }) => Promise<void>;
  isLoading: boolean;
}

export function AuthForm({ mode, onSubmit, isLoading }: AuthFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      await onSubmit({
        name: mode === 'register' ? name : undefined,
        email,
        password,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed');
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'Sign in' : 'Create account'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          {mode === 'register' ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">Name</label>
              <Input required value={name} onChange={(event) => setName(event.target.value)} />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Email</label>
            <Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted">Password</label>
            <Input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <div className="text-xs text-red-600">{error}</div> : null}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
