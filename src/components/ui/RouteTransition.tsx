import { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function RouteTransition({ children, className = "" }: { children: ReactNode; className?: string }) {
  const location = useLocation();

  return (
    <div className={`${className} route-transition`} key={location.pathname}>
      {children}
    </div>
  );
}
