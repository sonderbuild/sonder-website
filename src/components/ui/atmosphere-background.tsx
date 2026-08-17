export type AtmosphereVariant = "studio" | "apps" | "creative" | "neutral";

export function AtmosphereBackground({ variant = "studio" }: { variant?: AtmosphereVariant }) {
  return <div aria-hidden="true" className={`atmosphere-background atmosphere-background--${variant}`}>
    <span className="atmosphere-background__field atmosphere-background__field--one" />
    <span className="atmosphere-background__field atmosphere-background__field--two" />
    <span className="atmosphere-background__field atmosphere-background__field--three" />
    <span className="atmosphere-background__field atmosphere-background__field--four" />
    <span className="atmosphere-background__texture atmosphere-background__texture--coarse" />
    <span className="atmosphere-background__texture atmosphere-background__texture--fine" />
  </div>;
}
