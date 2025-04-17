import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CircleUserRound } from 'lucide-react'; // Icon for user menu
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const { user, signOut, loading } = useAuth();
  const location = useLocation(); // Get location object
  const pathname = location.pathname; // Get current path

  // Helper function for nav link classes
  const getNavLinkClass = (path: string) => {
    return pathname === path
      ? "transition-colors text-foreground" // Active style
      : "transition-colors text-foreground/60 hover:text-foreground/80"; // Inactive style
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
      <div className="flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link to="/" className={getNavLinkClass('/')}>
              Dashboard
            </Link>
            <Link to="/contacts" className={getNavLinkClass('/contacts')}>
              Contacts
            </Link>
            <Link to="/webhooks" className={getNavLinkClass('/webhooks')}>
              Webhooks
            </Link>
            {/* Add other nav links like Settings here */}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            {loading ? (
              <span className="text-sm text-muted-foreground">Loading...</span>
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full"
                  >
                    <CircleUserRound className="h-5 w-5" />
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem /* onClick={() => navigate('/settings')} */ >
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link to="/login">Login</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header; 