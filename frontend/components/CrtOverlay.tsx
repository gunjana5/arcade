// fixed scanlines + vignette - css lives in globals (.crt-overlay)
// aria-hidden so screen readers skip the decoration
export function CrtOverlay() {
  return <div className="crt-overlay" aria-hidden />;
}
