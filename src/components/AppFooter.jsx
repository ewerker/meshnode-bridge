import { Link } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export default function AppFooter() {
  const { isAuthenticated, logout, navigateToLogin, user } = useAuth();
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border mt-10">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/imprint" className="hover:text-foreground transition-colors">
            {t.common.imprint}
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link to="/about" className="hover:text-foreground transition-colors">
            {t.footer.about}
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {user?.email && (
                <span className="hidden sm:inline truncate max-w-[200px]" title={user.email}>
                  {user.full_name || user.email}
                </span>
              )}
              <button
                onClick={() => logout(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t.common.logout}
              </button>
            </>
          ) : (
            <button
              onClick={() => navigateToLogin()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              {t.common.signIn}
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}