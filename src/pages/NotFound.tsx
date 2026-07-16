import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    // Log at debug level only; 404s are expected for probes/old links and should not pollute error logs.
    if (import.meta.env.DEV) {
      console.debug("[404]", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted">
      <SEO title="Page Not Found — Heartify" description="The page you're looking for doesn't exist. Return to Heartify to keep exploring halal content." path="/404" />
      <div className="text-center">
        <h1 className="mb-4 text-display font-bold">404</h1>
        <p className="mb-4 text-heading text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
