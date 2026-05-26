interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-bg-elevated rounded-lg animate-pulse ${className}`}
      style={{ animationDuration: '1.4s' }}
    />
  );
}
