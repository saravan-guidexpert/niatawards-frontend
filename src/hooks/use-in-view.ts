import { useEffect, useState, type RefObject } from "react";

/** One-shot Intersection Observer. Used so below-fold landing sections can fade in without Framer Motion. */
export function useInViewOnce(ref: RefObject<Element | null>, rootMargin = "-80px") {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        obs.disconnect();
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, rootMargin, inView]);

  return inView;
}
