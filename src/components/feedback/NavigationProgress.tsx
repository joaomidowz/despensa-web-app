import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export function NavigationProgress() {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setIsVisible(true);
    const timer = window.setTimeout(() => setIsVisible(false), 520);

    return () => window.clearTimeout(timer);
  }, [location.key, location.pathname, location.search]);

  return (
    <div
      aria-hidden="true"
      className={`navigation-progress ${isVisible ? "navigation-progress--active" : ""}`}
    />
  );
}
