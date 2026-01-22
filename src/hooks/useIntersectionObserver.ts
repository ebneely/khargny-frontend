import { useEffect, useRef, useState, RefObject } from 'react';

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /**
   * Only trigger once when element enters viewport
   * @default true
   */
  triggerOnce?: boolean;
}

export interface UseIntersectionObserverResult {
  /**
   * Whether the element is currently intersecting
   */
  isIntersecting: boolean;
  
  /**
   * Whether the element has ever intersected (useful for lazy loading)
   */
  hasIntersected: boolean;
  
  /**
   * The intersection observer entry
   */
  entry?: IntersectionObserverEntry;
}

/**
 * Hook to detect when an element enters the viewport
 * Used for lazy loading place cards
 * 
 * @example
 * ```tsx
 * const cardRef = useRef<HTMLDivElement>(null);
 * const { hasIntersected } = useIntersectionObserver(cardRef, {
 *   rootMargin: '100px', // Load 100px before entering viewport
 *   threshold: 0.1
 * });
 * 
 * // Only fetch data when card is visible
 * const { data } = useQuery(QUERY, {
 *   skip: !hasIntersected
 * });
 * ```
 */
export function useIntersectionObserver(
  ref: RefObject<Element>,
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverResult {
  const { triggerOnce = true, ...observerOptions } = options;
  
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry>();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If already intersected and triggerOnce is true, don't observe again
    if (hasIntersected && triggerOnce) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      setEntry(entry);
      
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
        
        // If triggerOnce, disconnect after first intersection
        if (triggerOnce) {
          observer.disconnect();
        }
      }
    }, observerOptions);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, hasIntersected, triggerOnce, observerOptions]);

  return { isIntersecting, hasIntersected, entry };
}
