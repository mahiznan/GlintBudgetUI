interface PhoneFrameProps {
  src: string;
  alt: string;
  width?: number;
  tilt?: number;
  yOffset?: number;
  className?: string;
}

export default function PhoneFrame({
  src,
  alt,
  width = 90,
  tilt,
  yOffset,
  className = '',
}: PhoneFrameProps) {
  const hasTilt = tilt !== undefined && tilt !== 0;
  const hasOffset = yOffset !== undefined && yOffset !== 0;
  const transform =
    hasTilt || hasOffset
      ? [hasTilt ? `rotate(${tilt}deg)` : '', hasOffset ? `translateY(${yOffset}px)` : '']
          .filter(Boolean)
          .join(' ')
      : '';

  return (
    <div
      className={`login-phone-frame ${className}`.trim()}
      style={{ width: `${width}px`, transform }}
    >
      <img src={src} alt={alt} className="login-phone-img" />
    </div>
  );
}
