interface CatIconProps {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
}

/** Renders a category medallion icon as a circular image. */
export function CatIcon({ src, alt = '', size = 20, className = '' }: CatIconProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover shrink-0 ${className}`}
    />
  );
}
