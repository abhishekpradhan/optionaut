/** Route-level entrance: every navigation rises out of the void. CSS-
 *  driven (compositor-safe), disabled by the reduced-motion media rule. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-enter flex flex-1 flex-col">{children}</div>;
}
