import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("resize", callback);
  window.addEventListener("orientationchange", callback);

  return () => {
    window.removeEventListener("resize", callback);
    window.removeEventListener("orientationchange", callback);
  };
};

const getSnapshot = () =>
  typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false;
const getServerSnapshot = () => false;

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
