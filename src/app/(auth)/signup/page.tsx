import { Card, Button } from '@/components';

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <Card className="w-full max-w-sm">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Create Account</h2>
        <input
          type="email"
          placeholder="Email address"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 mb-3"
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 mb-4"
        />
        <Button className="w-full">Sign Up</Button>
      </Card>
    </main>
  );
}
