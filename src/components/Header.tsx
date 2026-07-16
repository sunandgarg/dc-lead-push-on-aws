import { Moon, Sun, LogOut, Menu, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import logo from '@/assets/logo.png';

export function Header() {
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={logo} 
              alt="DekhoCampus" 
              className="h-8 sm:h-10 w-auto"
            />
            <div className="hidden sm:block">
              <p className="text-xs text-muted-foreground">Lead Management CRM</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs text-muted-foreground hidden md:inline truncate max-w-[150px]">
                  {user.email}
                </span>
                <button
                  onClick={signOut}
                  className="flex h-8 sm:h-10 items-center gap-1.5 px-2 sm:px-3 rounded-lg border border-border bg-background transition-all hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-muted-foreground text-sm"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-border bg-background transition-all hover:bg-muted"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              ) : (
                <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
