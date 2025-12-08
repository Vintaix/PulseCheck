import Image from 'next/image';

export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <Image
      src="/pulsecheck-logo.png"
      alt="PulseCheck"
      width={32}
      height={32}
      className={`${className} logo-pulse object-contain`}
      priority
    />
  );
}

