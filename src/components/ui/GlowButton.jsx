function GlowButton({ as: Element = "button", className = "", children, ...props }) {
  return (
    <Element
      {...props}
      type={Element === "button" ? props.type ?? "button" : undefined}
      className={`glow-button ${className}`.trim()}
    >
      {children}
    </Element>
  );
}

export default GlowButton;
