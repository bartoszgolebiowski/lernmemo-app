import { authClient } from '~/lib/auth.client';

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className = '' }: SignOutButtonProps) {
  const handleSignOut = async () => {
    try {
      await authClient.signOut();
      // Redirect is handled by the onLogoutSuccess in the auth client
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className={`bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${className}`}
    >
      Sign Out
    </button>
  );
}
