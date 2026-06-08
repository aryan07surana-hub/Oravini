import { useEffect, useRef } from "react";

/**
 * Performance monitor hook - logs slow renders in development
 * Usage: usePerformanceMonitor("ComponentName")
 */
export function usePerformanceMonitor(componentName: string, threshold = 50) {
  const renderCount = useRef(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const renderTime = Date.now() - startTime.current;
    
    if (process.env.NODE_ENV === "development" && renderTime > threshold) {
      console.warn(
        `⚠️ Slow render detected in ${componentName}:`,
        `${renderTime}ms (render #${renderCount.current})`
      );
    }
    
    startTime.current = Date.now();
  });

  return renderCount.current;
}

/**
 * Query performance monitor - logs slow API calls
 */
export function logQueryPerformance(queryKey: string, startTime: number) {
  const duration = Date.now() - startTime;
  
  if (process.env.NODE_ENV === "development" && duration > 1000) {
    console.warn(`🐌 Slow query: ${queryKey} took ${duration}ms`);
  }
  
  if (process.env.NODE_ENV === "development" && duration > 3000) {
    console.error(`🔴 VERY slow query: ${queryKey} took ${duration}ms - consider optimization!`);
  }
}

/**
 * Simple performance profiler
 */
export class PerformanceProfiler {
  private static marks = new Map<string, number>();

  static start(label: string) {
    this.marks.set(label, Date.now());
  }

  static end(label: string, threshold = 100) {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No start mark found for: ${label}`);
      return;
    }

    const duration = Date.now() - startTime;
    this.marks.delete(label);

    if (process.env.NODE_ENV === "development") {
      const emoji = duration > threshold ? "🔴" : duration > threshold / 2 ? "⚠️" : "✅";
      console.log(`${emoji} ${label}: ${duration}ms`);
    }

    return duration;
  }
}

/**
 * Component render tracker - use in development only
 */
export function logRenderInfo(componentName: string, props?: any) {
  if (process.env.NODE_ENV === "development") {
    console.log(`🔄 ${componentName} rendered`, props ? { props } : "");
  }
}
