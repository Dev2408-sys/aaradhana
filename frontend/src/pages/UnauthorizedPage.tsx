import { Link } from 'react-router-dom';

export function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold text-navy-900">Access denied</h1>
      <p className="mt-2 text-sm text-navy-700/70">You do not have permission to view this page.</p>
      <Link to="/" className="mt-6 text-sm font-semibold text-orange-600 hover:text-orange-500">
        Back to home
      </Link>
    </div>
  );
}
