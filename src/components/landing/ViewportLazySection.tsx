import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Holds a below-fold homepage slot until it nears the viewport, then mounts
 * children (typically a React.lazy() section). Independent observers so one
 * section does not pull the rest.
 *
 * rootMargin 280px: start the chunk before the user arrives, but Why sits at
 * ~100vh so it is not intersecting on first paint with this margin.
 */
type Props = {
  id?: string;
  minHeight: string;
  className: string;
  heading: string;
  rootMargin?: string;
  children: ReactNode;
};

const ViewportLazySection = ({
  id,
  minHeight,
  className,
  heading,
  rootMargin = "280px 0px",
  children,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    if (id && window.location.hash === `#${id}`) {
      setReady(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setReady(true);
        obs.disconnect();
      },
      { root: null, rootMargin, threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [id, ready, rootMargin]);

  return (
    <div ref={ref} id={id} className={className} style={ready ? undefined : { minHeight }}>
      {ready ? (
        <Suspense fallback={<div style={{ minHeight }} aria-hidden="true" />}>
          {children}
        </Suspense>
      ) : (
        <h2 className="sr-only">{heading}</h2>
      )}
    </div>
  );
};

export default ViewportLazySection;
