import Image from "next/image";

import horizontalLogo from "../../../public/brand/time-motor-sales-horizontal.png";
import horizontalReversedLogo from "../../../public/brand/time-motor-sales-horizontal-reversed.png";
import compactMark from "../../../public/brand/time-motor-sales-mark.png";

type TimeMotorSalesLogoVariant = "horizontal" | "horizontal-reversed" | "mark";

type TimeMotorSalesLogoProps = {
  className?: string;
  decorative?: boolean;
  priority?: boolean;
  variant?: TimeMotorSalesLogoVariant;
};

const LOGO_ASSETS = {
  horizontal: { src: horizontalLogo, width: 1200, height: 225 },
  "horizontal-reversed": { src: horizontalReversedLogo, width: 1200, height: 226 },
  mark: { src: compactMark, width: 512, height: 504 }
} as const;

export function TimeMotorSalesLogo({
  className,
  decorative = false,
  priority = false,
  variant = "horizontal"
}: TimeMotorSalesLogoProps) {
  const asset = LOGO_ASSETS[variant];

  return (
    <Image
      alt={decorative ? "" : "Time Motor Sales"}
      className={className}
      height={asset.height}
      priority={priority}
      src={asset.src}
      unoptimized
      width={asset.width}
    />
  );
}
